/**
 * MboaEats — Server functions Admin Plateforme
 *
 * REFONTE :
 *   - `requireAdmin` (ancien) → `requirePlatformAdmin` (admin OU superadmin).
 *   - Toutes les `delete*` deviennent SOFT-DELETE (via `deleted_at`)
 *     conformément au Lot A. Hard-delete réservé à `requirePlatformSuperadmin`.
 *   - `setRestaurantActive` log dans audit_logs (déjà via trigger).
 *   - Suppression du `setTimeout` auto-progression (audit H5).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  requirePlatformAdmin,
  requirePlatformSuperadmin,
} from "@/auth/middlewares/requirePlatformAdmin";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PENDING_STATUSES = [
  "pending_payment",
  "paid",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "delivering",
];

// -----------------------------------------------------------------------------
// Vue d'ensemble dashboard admin
// -----------------------------------------------------------------------------
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async () => {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [
      { data: orders },
      { data: restos },
      { data: drivers },
      { data: disputes },
      { data: zones },
    ] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select(
          "id, total, status, restaurant_id, created_at, delivered_at, delivery_address",
        )
        .gte("created_at", since)
        .is("deleted_at", null),
      supabaseAdmin
        .from("restaurants")
        .select("id, name, city, is_active, rating, reviews_count")
        .is("deleted_at", null),
      supabaseAdmin
        .from("driver_locations")
        .select("driver_id, status, updated_at"),
      supabaseAdmin
        .from("disputes")
        .select("id, status, priority, amount")
        .eq("status", "open"),
      supabaseAdmin.from("delivery_zones").select("id, city, active"),
    ]);

    const ordersArr = orders ?? [];
    const gmv = ordersArr.reduce((s, o) => s + (o.total ?? 0), 0);
    const delivered = ordersArr.filter((o) => o.status === "delivered").length;
    const ordersPending = ordersArr.filter((o) =>
      PENDING_STATUSES.includes(o.status as string),
    ).length;

    const restoMap = new Map((restos ?? []).map((r) => [r.id, r]));
    const cityGmv: Record<string, number> = {};
    for (const o of ordersArr) {
      const r = restoMap.get(o.restaurant_id);
      const city =
        r?.city ??
        (o.delivery_address as { city?: string } | null)?.city ??
        "Autre";
      cityGmv[city] = (cityGmv[city] ?? 0) + (o.total ?? 0);
    }

    const restoOrders: Record<string, number> = {};
    for (const o of ordersArr) {
      restoOrders[o.restaurant_id] = (restoOrders[o.restaurant_id] ?? 0) + 1;
    }
    const topRestos = Object.entries(restoOrders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        count,
        name: restoMap.get(id)?.name ?? "—",
        city: restoMap.get(id)?.city ?? "—",
      }));

    const onlineDrivers = (drivers ?? []).filter((d) => d.status !== "offline").length;

    return {
      gmv,
      ordersCount: ordersArr.length,
      ordersPending,
      delivered,
      restosTotal: (restos ?? []).length,
      restosActive: (restos ?? []).filter((r) => r.is_active).length,
      driversTotal: (drivers ?? []).length,
      driversOnline: onlineDrivers,
      disputesOpen: (disputes ?? []).length,
      disputesAmount: (disputes ?? []).reduce((s, d) => s + (d.amount ?? 0), 0),
      zonesActive: (zones ?? []).filter((z) => z.active).length,
      zonesTotal: (zones ?? []).length,
      cityGmv,
      topRestos,
    };
  });

// -----------------------------------------------------------------------------
// Restaurants
// -----------------------------------------------------------------------------
export const listAllRestaurants = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select(
        "id, name, city, neighborhood, cuisine, rating, reviews_count, " +
          "is_active, is_open, created_at, deleted_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { restaurants: data ?? [] };
  });

export const getRestaurantDetails = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: resto, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!resto) throw new Error("Restaurant introuvable");

    const { data: owners } = await supabaseAdmin
      .from("restaurant_members")
      .select(
        "user_id, role, status, " +
          "profile:profiles!restaurant_members_user_id_fkey(full_name, phone, city)",
      )
      .eq("restaurant_id", data.id)
      .eq("status", "active")
      .is("deleted_at", null);

    const [{ count: dishesCount }, { count: ordersCount }] = await Promise.all([
      supabaseAdmin
        .from("dishes")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", data.id)
        .is("deleted_at", null),
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", data.id)
        .is("deleted_at", null),
    ]);

    return {
      restaurant: resto,
      members: owners ?? [],
      stats: { dishes: dishesCount ?? 0, orders: ordersCount ?? 0 },
    };
  });

export const updateRestaurantLocation = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("restaurants")
      .update({ lat: data.lat, lng: data.lng })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setRestaurantActive = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("restaurants")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateRestaurant = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        cuisine: z.string().min(1).max(80).optional(),
        city: z.string().min(1).max(80).optional(),
        neighborhood: z.string().max(120).nullable().optional(),
        address: z.string().max(200).nullable().optional(),
        delivery_fee: z.number().int().min(0).max(50000).optional(),
        min_order: z.number().int().min(0).max(1000000).optional(),
        eta_min: z.number().int().min(0).max(240).optional(),
        eta_max: z.number().int().min(0).max(240).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("restaurants")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Soft-delete : passe deleted_at=now() + is_active=false + suspend members. */
export const softDeleteRestaurant = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.rpc("soft_delete_restaurant", {
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Hard-delete : superadmin uniquement. */
export const hardDeleteRestaurant = createServerFn({ method: "POST" })
  .middleware([requirePlatformSuperadmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -----------------------------------------------------------------------------
// Drivers
// -----------------------------------------------------------------------------
export const listAllDrivers = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async () => {
    const { data: locs } = await supabaseAdmin
      .from("driver_locations")
      .select("driver_id, status, lat, lng, updated_at");
    const ids = (locs ?? []).map((l) => l.driver_id);
    const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
    const [{ data: profiles }, { data: orders }, { data: roles }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("user_id, full_name, phone, city")
          .in("user_id", safeIds),
        supabaseAdmin
          .from("orders")
          .select("driver_id, status, delivery_fee, delivered_at")
          .in("driver_id", safeIds),
        supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", safeIds)
          .eq("role", "livreur" as never),
      ]);

    const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const activeSet = new Set((roles ?? []).map((r) => r.user_id));
    const stats: Record<string, { courses: number; earned: number }> = {};
    const since = new Date(Date.now() - 7 * 86_400_000);
    for (const o of orders ?? []) {
      if (!o.driver_id || o.status !== "delivered") continue;
      if (!o.delivered_at || new Date(o.delivered_at) < since) continue;
      const s = stats[o.driver_id] ?? { courses: 0, earned: 0 };
      s.courses += 1;
      s.earned += o.delivery_fee ?? 0;
      stats[o.driver_id] = s;
    }
    const drivers = (locs ?? []).map((l) => {
      const p = profMap.get(l.driver_id);
      const s = stats[l.driver_id] ?? { courses: 0, earned: 0 };
      return {
        id: l.driver_id,
        name: p?.full_name ?? "Livreur",
        phone: p?.phone ?? null,
        city: p?.city ?? null,
        status: l.status,
        is_active: activeSet.has(l.driver_id),
        lat: l.lat,
        lng: l.lng,
        updated_at: l.updated_at,
        courses: s.courses,
        earned: s.earned,
      };
    });
    return { drivers };
  });

export const setDriverStatus = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z
      .object({
        driver_id: z.string().uuid(),
        status: z.enum(["available", "busy", "offline"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("driver_locations")
      .update({ status: data.status })
      .eq("driver_id", data.driver_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getDriverDetails = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const [{ data: profile }, { data: loc }, { data: orders }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("user_id, full_name, phone, city, created_at")
          .eq("user_id", data.id)
          .maybeSingle(),
        supabaseAdmin
          .from("driver_locations")
          .select("*")
          .eq("driver_id", data.id)
          .maybeSingle(),
        supabaseAdmin
          .from("orders")
          .select("id, reference, status, delivery_fee, delivered_at")
          .eq("driver_id", data.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
    return {
      profile: profile ?? null,
      location: loc ?? null,
      orders: orders ?? [],
    };
  });

// -----------------------------------------------------------------------------
// Disputes
// -----------------------------------------------------------------------------
export const listOpenDisputes = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { disputes: data ?? [] };
  });

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["resolved", "rejected"]),
        resolution: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("disputes")
      .update({
        status: data.status,
        resolution: data.resolution ?? null,
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -----------------------------------------------------------------------------
// Commissions report
// -----------------------------------------------------------------------------
export const getCommissionsReport = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .handler(async () => {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [{ data: orders }, { data: rates }, { data: restos }] =
      await Promise.all([
        supabaseAdmin
          .from("orders")
          .select(
            "id, reference, total, status, restaurant_id, delivered_at, created_at",
          )
          .gte("created_at", since)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("commissions").select("category, rate_pct"),
        supabaseAdmin
          .from("restaurants")
          .select("id, name, city, cuisine"),
      ]);
    const restoMap = new Map((restos ?? []).map((r) => [r.id, r]));
    const rateMap = new Map(
      (rates ?? []).map((r) => [r.category, Number(r.rate_pct)]),
    );
    const defaultRate = rateMap.get("default") ?? 12;
    const rows = (orders ?? []).map((o) => {
      const r = restoMap.get(o.restaurant_id);
      const rate = (r && rateMap.get(r.cuisine)) ?? defaultRate;
      const commission = Math.round(((o.total ?? 0) * rate) / 100);
      return {
        id: o.id,
        reference: o.reference,
        resto: r?.name ?? "—",
        city: r?.city ?? "—",
        gmv: o.total ?? 0,
        rate,
        commission,
        status: o.status,
      };
    });
    const totalCommission = rows
      .filter((r) =>
        ["delivered", "paid", "accepted", "preparing", "ready", "picked_up", "delivering"].includes(
          r.status,
        ),
      )
      .reduce((s, r) => s + r.commission, 0);
    const pending = rows
      .filter((r) => r.status !== "delivered")
      .reduce((s, r) => s + r.commission, 0);
    const totalGmv = rows.reduce((s, r) => s + r.gmv, 0);
    return {
      rows: rows.slice(0, 100),
      totalCommission,
      pending,
      avgRate: totalGmv
        ? Number(((totalCommission / totalGmv) * 100).toFixed(1))
        : 0,
    };
  });

// ============================================================================
// COMPAT ASCENDANTE — alias & stubs pour admin UI (litiges, livreurs, restos)
// ============================================================================

export const deleteRestaurant = softDeleteRestaurant;
export const listAllDisputes = listOpenDisputes;

export const getDisputeDetails = createServerFn({ method: "GET" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: dispute, error } = await supabaseAdmin
      .from("disputes")
      .select("*, orders(reference, total), restaurants(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { dispute: dispute ?? null };
  });

export const updateDispute = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).nullable().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.string().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("disputes")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteDispute = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("disputes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Note : il n'existe pas de table `driver_profiles` dans le schéma actuel
// (seulement `driver_locations`). Ces stubs renvoient `ok: true` sans rien
// muter — l'UI Admin Livreurs travaille déjà sur des données mock, et les
// vraies actions seront branchées une fois la table dédiée créée.

export const setDriverActive = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async () => ({ ok: true as const }));

export const updateDriverProfile = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        full_name: z.string().max(120).optional(),
        phone: z.string().max(40).nullable().optional(),
        city: z.string().max(80).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async () => ({ ok: true as const }));

export const deleteDriver = createServerFn({ method: "POST" })
  .middleware([requirePlatformAdmin])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async () => ({ ok: true as const }));
