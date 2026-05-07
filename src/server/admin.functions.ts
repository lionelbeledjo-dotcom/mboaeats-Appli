import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const since = new Date(); since.setDate(since.getDate() - 7);

    const [{ data: orders }, { data: restos }, { data: drivers }, { data: disputes }, { data: zones }] = await Promise.all([
      supabaseAdmin.from("orders").select("id, total, status, restaurant_id, created_at, delivered_at, delivery_address").gte("created_at", since.toISOString()),
      supabaseAdmin.from("restaurants").select("id, name, city, is_active, rating, reviews_count"),
      supabaseAdmin.from("driver_locations").select("driver_id, status, updated_at"),
      supabaseAdmin.from("disputes").select("id, status, priority, amount").eq("status", "open"),
      supabaseAdmin.from("delivery_zones").select("id, city, active"),
    ]);

    const ordersArr = orders ?? [];
    const gmv = ordersArr.reduce((s, o) => s + (o.total ?? 0), 0);
    const delivered = ordersArr.filter((o) => o.status === "delivered").length;
    const PENDING_STATUSES = ["pending_payment", "paid", "accepted", "preparing", "ready", "picked_up", "delivering"];
    const ordersPending = ordersArr.filter((o) => PENDING_STATUSES.includes(o.status as string)).length;

    // GMV par ville (via délivery_address.city ou via resto)
    const restoMap = new Map((restos ?? []).map((r) => [r.id, r]));
    const cityGmv: Record<string, number> = {};
    for (const o of ordersArr) {
      const r = restoMap.get(o.restaurant_id);
      const city = r?.city || (o.delivery_address as any)?.city || "Autre";
      cityGmv[city] = (cityGmv[city] ?? 0) + (o.total ?? 0);
    }

    // Top restos
    const restoOrders: Record<string, number> = {};
    for (const o of ordersArr) restoOrders[o.restaurant_id] = (restoOrders[o.restaurant_id] ?? 0) + 1;
    const topRestos = Object.entries(restoOrders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count, name: restoMap.get(id)?.name ?? "—", city: restoMap.get(id)?.city ?? "—" }));

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

export const listAllRestaurants = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, city, neighborhood, cuisine, rating, reviews_count, is_active, is_open, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { restaurants: data ?? [] };
  });

export const setRestaurantActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("restaurants").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllDrivers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data: locs } = await supabaseAdmin
      .from("driver_locations")
      .select("driver_id, status, lat, lng, updated_at");
    // Joindre profils + agrégats
    const ids = (locs ?? []).map((l) => l.driver_id);
    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, full_name, phone, city").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("orders").select("driver_id, status, delivery_fee, delivered_at").in("driver_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const stats: Record<string, { courses: number; earned: number }> = {};
    const since = new Date(); since.setDate(since.getDate() - 7);
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
        lat: l.lat,
        lng: l.lng,
        updated_at: l.updated_at,
        courses: s.courses,
        earned: s.earned,
      };
    });
    return { drivers };
  });

export const listAllDisputes = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    // Hydrate orders + restaurants manually (pas de FK déclarée)
    const orderIds = Array.from(new Set((data ?? []).map((d) => d.order_id).filter(Boolean)));
    const restoIds = Array.from(new Set((data ?? []).map((d) => d.restaurant_id).filter(Boolean) as string[]));
    const [{ data: orders }, { data: restos }] = await Promise.all([
      orderIds.length
        ? supabaseAdmin.from("orders").select("id, reference, total").in("id", orderIds)
        : Promise.resolve({ data: [] }),
      restoIds.length
        ? supabaseAdmin.from("restaurants").select("id, name").in("id", restoIds)
        : Promise.resolve({ data: [] }),
    ]);
    const oMap = new Map((orders ?? []).map((o) => [o.id, o]));
    const rMap = new Map((restos ?? []).map((r) => [r.id, r]));
    const enriched = (data ?? []).map((d) => ({
      ...d,
      orders: oMap.get(d.order_id) ?? null,
      restaurants: d.restaurant_id ? rMap.get(d.restaurant_id) ?? null : null,
    }));
    return { disputes: enriched };
  });

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["resolved", "rejected"]),
      resolution: z.string().max(500).optional(),
    }).parse(d)
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
    return { ok: true };
  });

export const getCommissionsReport = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const since = new Date(); since.setDate(since.getDate() - 7);
    const [{ data: orders }, { data: rates }, { data: restos }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, reference, total, status, restaurant_id, delivered_at, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("commissions").select("category, rate_pct"),
      supabaseAdmin.from("restaurants").select("id, name, city, cuisine"),
    ]);
    const restoMap = new Map((restos ?? []).map((r) => [r.id, r]));
    const rateMap = new Map((rates ?? []).map((r) => [r.category, Number(r.rate_pct)]));
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
    const totalCommission = rows.filter((r) => ["delivered", "paid", "accepted", "preparing", "ready", "picked_up", "delivering"].includes(r.status))
      .reduce((s, r) => s + r.commission, 0);
    const pending = rows.filter((r) => r.status !== "delivered").reduce((s, r) => s + r.commission, 0);
    const totalGmv = rows.reduce((s, r) => s + r.gmv, 0);
    return {
      rows: rows.slice(0, 100),
      totalCommission,
      pending,
      avgRate: totalGmv ? Number(((totalCommission / totalGmv) * 100).toFixed(1)) : 0,
    };
  });
