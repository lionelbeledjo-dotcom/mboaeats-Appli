/**
 * MboaEats — Server functions Restaurant (espace gestionnaire)
 *
 * REFONTE MULTI-TENANT :
 *   - `requireSupabaseAuth` remplacé par `requireAuth`
 *   - Chaque action sur un resto exige un `restaurant_id` dans le payload
 *     et passe par `assertMembership(context, restaurant_id, minRole)`
 *   - L'ancien `owner_id = userId` disparaît : un user peut être membre
 *     de plusieurs restos, et différents rôles selon le resto.
 *
 * `getMyRestaurant` retourne maintenant TOUS les restos dont le user est
 * membre, pas juste le premier — fini le bug audit "1 user = 1 resto".
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middlewares/requireAuth";
import { assertMembership } from "@/auth/middlewares/requireMembership";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// -----------------------------------------------------------------------------
// listMyRestaurants — tous les restos dont le user est membre
// -----------------------------------------------------------------------------
export const listMyRestaurants = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    // RLS "Restaurants: members read" du Lot A filtre déjà par membership.
    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id, slug, name, cuisine, city, neighborhood, image_url, " +
          "is_open, is_active, deleted_at, " +
          "members:restaurant_members!inner(role,status)",
      )
      .eq("members.user_id", context.userId)
      .eq("members.status", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { restaurants: data ?? [] };
  });

// -----------------------------------------------------------------------------
// getRestaurant — détails complets pour la gestion
// -----------------------------------------------------------------------------
export const getRestaurant = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ restaurant_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "kitchen");
    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", data.restaurant_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Restaurant introuvable");
    return { restaurant: row };
  });

// -----------------------------------------------------------------------------
// updateRestaurant — manager+
// -----------------------------------------------------------------------------
export const updateRestaurant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        is_open: z.boolean().optional(),
        name: z.string().min(2).max(120).optional(),
        cuisine: z.string().min(2).max(80).optional(),
        neighborhood: z.string().max(80).nullable().optional(),
        eta_min: z.number().int().min(5).max(120).optional(),
        eta_max: z.number().int().min(5).max(180).optional(),
        delivery_fee: z.number().int().min(0).max(50000).optional(),
        min_order: z.number().int().min(0).max(100000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    const { restaurant_id, ...patch } = data;
    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .update(patch)
      .eq("id", restaurant_id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurant: row };
  });

// -----------------------------------------------------------------------------
// listRestaurantOrders — staff+
// -----------------------------------------------------------------------------
export const listRestaurantOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        status: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "staff");
    let q = supabaseAdmin
      .from("orders")
      .select(
        "id, reference, status, total, subtotal, delivery_fee, eta_minutes, " +
          "commission_rate_applied, commission_amount, restaurant_payout, " +
          "created_at, paid_at, accepted_at, ready_at, picked_up_at, " +
          "delivered_at, delivery_address, notes, user_id, " +
          "items:order_items(id, name, qty, unit_price, line_total)",
      )
      .eq("restaurant_id", data.restaurant_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) q = q.eq("status", data.status as never);
    const { data: rawRows, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (rawRows ?? []) as unknown as Array<
      Record<string, unknown> & { user_id: string | null }
    >;

    // Hydrater nom + téléphone client depuis profiles
    const userIds = Array.from(
      new Set(rows.map((r) => r.user_id).filter(Boolean)),
    ) as string[];
    let profiles: Record<string, { full_name: string | null; phone: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      profiles = Object.fromEntries(
        (profs ?? []).map((p) => [
          p.user_id,
          { full_name: p.full_name, phone: p.phone },
        ]),
      );
    }
    const enriched = rows.map((r) => ({
      ...r,
      client_name: r.user_id ? profiles[r.user_id]?.full_name ?? null : null,
      client_phone: r.user_id ? profiles[r.user_id]?.phone ?? null : null,
    }));
    const newCount = enriched.filter((o) => ["draft", "pending_payment", "paid"].includes((o as { status?: string }).status ?? "")).length;
    return { orders: enriched, newCount };
  });

// -----------------------------------------------------------------------------
// updateOrderStatus — staff+ (commande doit appartenir à ce resto)
// -----------------------------------------------------------------------------
const ALLOWED_STATUS = ["accepted", "preparing", "ready", "cancelled"] as const;

// Transitions autorisées côté restaurateur
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["accepted", "cancelled"],
  pending_payment: ["accepted", "cancelled"],
  paid: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
};

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(ALLOWED_STATUS),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // 1) Charger la commande et identifier le resto cible
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("id", data.order_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("Commande introuvable");

    // 2) Vérifier la membership sur CE resto
    await assertMembership(context, order.restaurant_id, "staff");

    // 3) Vérifier la transition
    const allowed = ALLOWED_TRANSITIONS[order.status as string] ?? [];
    if (!allowed.includes(data.status)) {
      throw new Error(
        `Transition interdite : ${order.status} → ${data.status}`,
      );
    }
    if (data.status === "cancelled" && !data.note?.trim()) {
      throw new Error("Une raison est obligatoire pour refuser une commande.");
    }

    // 4) Update + event
    const stamp: Record<string, string> = {};
    const now = new Date().toISOString();
    if (data.status === "accepted") stamp.accepted_at = now;
    if (data.status === "ready") stamp.ready_at = now;
    if (data.status === "cancelled") stamp.cancelled_at = now;

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status, ...stamp })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("order_events").insert({
      order_id: data.order_id,
      event_type: data.status,
      payload: data.note ? { note: data.note } : {},
      created_by: context.userId,
    });

    // Emails — awaited inline (Workers tue les promesses détachées).
    try {
      const { sendEmail, getUserEmail, listOnlineApprovedDrivers } = await import("@/server/email.functions");
      const { data: full } = await supabaseAdmin
        .from("orders")
        .select("id, reference, user_id, restaurant_id, eta_minutes, delivery_fee, delivery_address, restaurants(name, city)")
        .eq("id", data.order_id).maybeSingle();
      if (full) {
        const row = full as any;
        const restaurant_name = row.restaurants?.name ?? "Le restaurant";
        const city = row.restaurants?.city ?? "votre ville";
        const reference = row.reference;
        const order_id = row.id;

        if (data.status === "accepted") {
          const clientEmail = await getUserEmail(row.user_id);
          if (clientEmail) await sendEmail({
            to: clientEmail, template: "order_accepted_client",
            related_id: order_id, user_id: row.user_id,
            data: { reference, restaurant_name, order_id, eta_minutes: row.eta_minutes },
          });
        } else if (data.status === "cancelled") {
          const clientEmail = await getUserEmail(row.user_id);
          if (clientEmail) await sendEmail({
            to: clientEmail, template: "order_rejected_client",
            related_id: order_id, user_id: row.user_id,
            data: { reference, restaurant_name, reason: data.note },
          });
        } else if (data.status === "ready") {
          const drivers = await listOnlineApprovedDrivers();
          const delivery_address =
            typeof row.delivery_address === "object" && row.delivery_address
              ? (row.delivery_address.label || row.delivery_address.address || "")
              : "";
          // 1 ligne email_log par livreur via related_id unique
          // related_id volontairement omis : email_log.related_id est UUID,
          // un composite ${order_id}-${driver_id} ferait échouer l'INSERT.
          // Le wrapper insère alors une ligne email_log sans dédup (1 par livreur).
          await Promise.all(drivers.map((d) => sendEmail({
            to: d.email, template: "order_ready_drivers",
            user_id: d.user_id,
            data: { reference, city, restaurant_name, delivery_address, delivery_fee: row.delivery_fee },
          })));
        }
      }
    } catch (e) { console.error("[updateOrderStatus email] failed", e); }

    return { ok: true as const };
  });

// -----------------------------------------------------------------------------
// Menu CRUD (managers+)
// -----------------------------------------------------------------------------
export const getRestaurantMenu = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ restaurant_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "kitchen");
    const [cats, dishes] = await Promise.all([
      supabaseAdmin
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", data.restaurant_id)
        .order("sort_order"),
      supabaseAdmin
        .from("dishes")
        .select("*")
        .eq("restaurant_id", data.restaurant_id)
        .is("deleted_at", null)
        .order("sort_order"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (dishes.error) throw new Error(dishes.error.message);
    return { categories: cats.data ?? [], dishes: dishes.data ?? [] };
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        restaurant_id: z.string().uuid(),
        name: z.string().min(1).max(80),
        sort_order: z.number().int().min(0).max(999).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    const payload = {
      restaurant_id: data.restaurant_id,
      name: data.name,
      sort_order: data.sort_order ?? 0,
    };
    const q = data.id
      ? supabaseAdmin
          .from("menu_categories")
          .update(payload)
          .eq("id", data.id)
          .eq("restaurant_id", data.restaurant_id) // double safety
          .select()
          .single()
      : supabaseAdmin.from("menu_categories").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return { category: row };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        restaurant_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    const { error } = await supabaseAdmin
      .from("menu_categories")
      .delete()
      .eq("id", data.id)
      .eq("restaurant_id", data.restaurant_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const upsertDish = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        restaurant_id: z.string().uuid(),
        category_id: z.string().uuid().nullable().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).nullable().optional(),
        price: z.number().int().min(0).max(1_000_000),
        image_url: z.string().url().nullable().optional(),
        is_available: z.boolean().optional(),
        is_popular: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    const payload = {
      restaurant_id: data.restaurant_id,
      category_id: data.category_id ?? null,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      image_url: data.image_url ?? null,
      is_available: data.is_available ?? true,
      is_popular: data.is_popular ?? false,
    };
    const q = data.id
      ? supabaseAdmin
          .from("dishes")
          .update(payload)
          .eq("id", data.id)
          .eq("restaurant_id", data.restaurant_id)
          .select()
          .single()
      : supabaseAdmin.from("dishes").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return { dish: row };
  });

export const deleteDish = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        restaurant_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    // Soft-delete plutôt que delete physique (audit log + restauration)
    const { error } = await supabaseAdmin
      .from("dishes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("restaurant_id", data.restaurant_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Flip is_available d'un plat — utilisé par le toggle direct sur la liste.
export const toggleDishAvailability = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        restaurant_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    const { data: cur, error: e1 } = await supabaseAdmin
      .from("dishes")
      .select("is_available")
      .eq("id", data.id)
      .eq("restaurant_id", data.restaurant_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!cur) throw new Error("Plat introuvable");
    const next = !cur.is_available;
    const { error } = await supabaseAdmin
      .from("dishes")
      .update({ is_available: next })
      .eq("id", data.id)
      .eq("restaurant_id", data.restaurant_id);
    if (error) throw new Error(error.message);
    return { is_available: next };
  });

// Garantit que les 5 catégories MboaEats standards existent pour ce resto.
export const ensureStandardCategories = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ restaurant_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    const STD = [
      { name: "Entrée", sort_order: 1 },
      { name: "Plat", sort_order: 2 },
      { name: "Dessert", sort_order: 3 },
      { name: "Boisson", sort_order: 4 },
      { name: "Accompagnement", sort_order: 5 },
    ];
    const { data: existing } = await supabaseAdmin
      .from("menu_categories")
      .select("name")
      .eq("restaurant_id", data.restaurant_id);
    const have = new Set((existing ?? []).map((c) => c.name));
    const missing = STD.filter((s) => !have.has(s.name)).map((s) => ({
      restaurant_id: data.restaurant_id,
      name: s.name,
      sort_order: s.sort_order,
    }));
    if (missing.length > 0) {
      const { error } = await supabaseAdmin
        .from("menu_categories")
        .insert(missing);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const, created: missing.length };
  });



// -----------------------------------------------------------------------------
// Stats restaurant (staff+)
// -----------------------------------------------------------------------------
export const getRestaurantStats = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ restaurant_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "staff");
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("id, total, status, created_at")
      .eq("restaurant_id", data.restaurant_id)
      .is("deleted_at", null)
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const orders = rows ?? [];
    const delivered = orders.filter((o) => o.status === "delivered");
    const revenue = delivered.reduce((s, o) => s + (o.total ?? 0), 0);
    const inProgress = orders.filter((o) =>
      [
        "paid",
        "accepted",
        "preparing",
        "ready",
        "picked_up",
        "delivering",
      ].includes(o.status as string),
    ).length;
    return {
      ordersCount: orders.length,
      deliveredCount: delivered.length,
      inProgress,
      revenue,
      avgTicket: delivered.length ? Math.round(revenue / delivered.length) : 0,
    };
  });

// -----------------------------------------------------------------------------
// createMyRestaurant — onboarding (user authentifié)
// -----------------------------------------------------------------------------
// Le user devient automatiquement owner via le trigger
// `tg_resto_auto_owner_membership` du Lot A.
export const createMyRestaurant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(2).max(120),
        cuisine: z.string().min(2).max(80),
        city: z.string().min(2).max(80),
        neighborhood: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // GARDE-FOU ANTI-SPAM : un user ne peut pas avoir plusieurs restos en
    // pending simultanément. Évite qu'un attaquant inscrit n soumissions
    // pour saturer la file de modération admin.
    const { data: existing } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, validation_status")
      .eq("owner_id", context.userId)
      .eq("validation_status", "pending")
      .is("deleted_at", null)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error(
        "Vous avez déjà un restaurant en attente de validation. " +
          "Veuillez patienter jusqu'à la décision de notre équipe.",
      );
    }

    const slug =
      data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) +
      "-" +
      Math.random().toString(36).slice(2, 6);

    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .insert({
        // owner_id legacy : on garde pour rétrocompat, mais c'est le trigger
        // auto-membership qui crée la vraie autorité.
        owner_id: context.userId,
        slug,
        name: data.name,
        cuisine: data.cuisine,
        city: data.city,
        neighborhood: data.neighborhood ?? null,
        // MODÉRATION ACTIVE : le resto démarre EN ATTENTE et INVISIBLE.
        // Un admin doit le valider explicitement avant que des clients
        // puissent passer commande. Voir migration `resto_moderation`.
        is_open: false,
        is_active: false,
        validation_status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // ATTRIBUTION DU RÔLE 'restaurateur' À L'UTILISATEUR.
    //
    // Sans ça, le RoleGuard sur /restaurant continuerait de voir le user
    // comme un simple 'client' (rôle par défaut à l'inscription) et lui
    // afficherait l'écran "Espace réservé aux restaurateurs partenaires"
    // au lieu de l'écran "En attente de validation".
    //
    // Note : on attribue le rôle MÊME SI le resto est en validation_status
    // 'pending'. C'est délibéré : le rôle dit "tu as un projet de resto",
    // le validation_status dit "ton resto est-il visible publiquement".
    // Les deux sont indépendants — un partenaire dont le resto est encore
    // en attente doit pouvoir VOIR l'écran "En attente", pas l'écran
    // public générique.
    //
    // upsert (ON CONFLICT) protège contre les doublons si l'utilisateur
    // avait déjà ce rôle (cas re-inscription après suppression de resto).
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "restaurateur" },
        { onConflict: "user_id,role" },
      );
    if (roleErr) {
      // On NE LÈVE PAS d'exception ici. Le resto est déjà créé en base, ce
      // serait une régression UX que l'inscription échoue après ce point.
      // On logue juste pour qu'un admin puisse corriger manuellement.
      // eslint-disable-next-line no-console
      console.warn("[createMyRestaurant] role grant failed:", roleErr.message);
    }

    return { restaurant: row };
  });

// -----------------------------------------------------------------------------
// Gestion des membres (owner only)
// -----------------------------------------------------------------------------
export const inviteRestaurantMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        user_id: z.string().uuid(),
        role: z.enum(["manager", "staff", "kitchen"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "owner");
    const { error } = await supabaseAdmin.from("restaurant_members").upsert(
      {
        restaurant_id: data.restaurant_id,
        user_id: data.user_id,
        role: data.role,
        status: "active",
        invited_by: context.userId,
        invited_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeRestaurantMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        user_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "owner");
    // Note : si c'était le dernier owner, le trigger
    // `tg_ensure_at_least_one_owner` du Lot A va refuser l'opération.
    const { error } = await supabaseAdmin
      .from("restaurant_members")
      .update({ status: "suspended", deleted_at: new Date().toISOString() })
      .eq("restaurant_id", data.restaurant_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listRestaurantMembers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ restaurant_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "manager");
    const { data: rows, error } = await supabaseAdmin
      .from("restaurant_members")
      .select(
        "user_id, role, status, joined_at, invited_at, invited_by, " +
          "profile:profiles!restaurant_members_user_id_fkey(full_name, phone, city)",
      )
      .eq("restaurant_id", data.restaurant_id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    return { members: rows ?? [] };
  });

// ============================================================================
// COMPAT ASCENDANTE — getMyRestaurant / updateMyRestaurant
// ============================================================================
// Ces alias conservent la signature historique utilisée par /restaurant.tsx :
// `getMyRestaurant()` sans args et `updateMyRestaurant({ data: { id, ... } })`.

export const getMyRestaurant = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    // On lit via supabaseAdmin (service role) pour ne pas dépendre des
    // policies RLS — notamment "Restaurants public read" qui ne laisse voir
    // que les restos approved+active et bloquerait l'owner d'un resto en
    // pending. On filtre strictement par owner_id = userId courant.
    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("owner_id", context.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[getMyRestaurant] query error:", error);
    }
    return { restaurant: (row as unknown as Record<string, any>) ?? null };
  });

export const updateMyRestaurant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        is_open: z.boolean().optional(),
        name: z.string().min(2).max(120).optional(),
        cuisine: z.string().min(2).max(80).optional(),
        neighborhood: z.string().max(80).nullable().optional(),
        eta_min: z.number().int().min(5).max(120).optional(),
        eta_max: z.number().int().min(5).max(180).optional(),
        delivery_fee: z.number().int().min(0).max(50000).optional(),
        min_order: z.number().int().min(0).max(100000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.id, "manager");
    const { id, ...patch } = data;
    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurant: row };
  });

// ============================================================================
// PACK 7 — Profil restaurant éditable
// ============================================================================

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"] as const;
const DaySchema = z.object({
  is_open: z.boolean(),
  open: z.string().regex(HHMM, "Format HH:MM attendu"),
  close: z.string().regex(HHMM, "Format HH:MM attendu"),
});
const OpeningHoursSchema = z.object({
  lundi: DaySchema, mardi: DaySchema, mercredi: DaySchema, jeudi: DaySchema,
  vendredi: DaySchema, samedi: DaySchema, dimanche: DaySchema,
});

// Tél Cameroun : +237XXXXXXXXX (9 chiffres) ou 9 chiffres locaux
const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+237)?\s*[26]\d{8}$/, "Format Cameroun attendu (+237 ou 9 chiffres)");

export const updateMyRestaurantProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        description: z.string().max(280).nullable().optional(),
        phone: phoneSchema.nullable().optional().or(z.literal("").transform(() => null)),
        cover_url: z.string().url().nullable().optional(),
        logo_url: z.string().url().nullable().optional(),
        opening_hours: OpeningHoursSchema.optional(),
        manually_closed: z.boolean().optional(),
        manually_open: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    // Même logique de résolution que getMyRestaurant — surtout pas de divergence
    const { data: existing, error: e1 } = await supabaseAdmin
      .from("restaurants")
      .select("id, owner_id")
      .eq("owner_id", context.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!existing) throw new Error("Aucun restaurant rattaché à votre compte");

    const patch: Record<string, unknown> = {};
    if (data.description !== undefined) patch.description = data.description;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.cover_url !== undefined) patch.cover_url = data.cover_url;
    if (data.logo_url !== undefined) patch.logo_url = data.logo_url;
    if (data.opening_hours !== undefined) patch.opening_hours = data.opening_hours;
    if (data.manually_closed !== undefined) patch.manually_closed = data.manually_closed;
    if (data.manually_open !== undefined) patch.manually_open = data.manually_open;


    if (Object.keys(patch).length === 0) {
      return { restaurant: existing };
    }

    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .update(patch as never)
      .eq("id", existing.id)
      .eq("owner_id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurant: row };
  });

// L'upload du binaire se fait côté client via supabase.storage (bucket public
// 'restaurant-images'). Cette fonction côté serveur enregistre l'URL publique
// retournée sur la colonne adéquate, en vérifiant l'ownership.
export const setRestaurantImage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        kind: z.enum(["cover", "logo"]),
        url: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: e1 } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("owner_id", context.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!existing) throw new Error("Aucun restaurant rattaché à votre compte");

    const column = data.kind === "cover" ? "cover_url" : "logo_url";
    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .update({ [column]: data.url } as never)
      .eq("id", existing.id)
      .eq("owner_id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurant: row };
  });

// -----------------------------------------------------------------------------
// RATTRAPAGE MANUEL pour comptes existants (à exécuter une fois dans l'éditeur
// SQL) — restaure le rôle 'restaurateur' pour tout owner ayant déjà un resto
// en base mais à qui le rôle n'a jamais été attribué (anciens comptes créés
// avant le fix de createMyRestaurant).
//
// -- INSERT INTO user_roles (user_id, role)
// -- SELECT DISTINCT owner_id, 'restaurateur'
// -- FROM restaurants
// -- WHERE owner_id IS NOT NULL
// -- ON CONFLICT (user_id, role) DO NOTHING;
//
// -- Ceinture + bretelles : laisser l'owner lire son propre resto même
// -- quand validation_status != 'approved' (la policy "Restaurants public
// -- read" bloque les non-approved). À exécuter une fois :
// -- CREATE POLICY "Restaurants owner read"
// -- ON public.restaurants FOR SELECT
// -- TO authenticated
// -- USING (owner_id = auth.uid());

// ============================================================================
// MODÉRATION SUPERADMIN — Pack 3
// ============================================================================

async function assertSuperadmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["superadmin", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Superadmin role required");
}

export const getRestaurantsForModeration = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        status: z
          .enum(["pending", "approved", "rejected", "all"])
          .optional()
          .default("pending"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);

    let q = supabaseAdmin
      .from("restaurants")
      .select(
        "id, name, slug, cuisine, city, neighborhood, image_url, owner_id, " +
          "validation_status, validation_note, validated_at, created_at, is_active, commission_rate",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data.status !== "all") {
      q = q.eq("validation_status", data.status);
    }

    const { data: rowsRaw, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (rowsRaw ?? []) as Array<Record<string, any>>;

    const ownerIds = Array.from(
      new Set(rows.map((r) => r.owner_id).filter(Boolean) as string[]),
    );


    // Profils (full_name + phone)
    const profilesMap = new Map<string, { full_name: string | null; phone: string | null }>();
    if (ownerIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", ownerIds);
      for (const p of profs ?? []) {
        profilesMap.set(p.user_id, { full_name: p.full_name, phone: p.phone });
      }
    }

    // Emails via auth.admin.getUserById (≤ 50 appels)
    const emailMap = new Map<string, string | null>();
    await Promise.all(
      ownerIds.map(async (uid) => {
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
          emailMap.set(uid, u?.user?.email ?? null);
        } catch {
          emailMap.set(uid, null);
        }
      }),
    );

    const restaurants = rows.map((r) => ({
      ...r,
      owner_email: r.owner_id ? emailMap.get(r.owner_id) ?? null : null,
      owner_full_name: r.owner_id ? profilesMap.get(r.owner_id)?.full_name ?? null : null,
      owner_phone: r.owner_id ? profilesMap.get(r.owner_id)?.phone ?? null : null,
    }));


    // Compteurs par statut (pour les badges des tabs)
    const { data: counts } = await supabaseAdmin
      .from("restaurants")
      .select("validation_status")
      .is("deleted_at", null);
    const tally = { pending: 0, approved: 0, rejected: 0, all: 0 };
    for (const c of counts ?? []) {
      tally.all++;
      const s = c.validation_status as keyof typeof tally;
      if (s in tally) tally[s]++;
    }

    return { restaurants, counts: tally };
  });

export const moderateRestaurant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurantId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        note: z.string().max(1000).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Log non-PII : on garde uniquement les UUIDs et l'action.
    console.log("[moderateRestaurant] actor=", context.userId, "resto=", data.restaurant_id, "action=", data.action);
    await assertSuperadmin(context.userId);

    if (data.action === "reject" && !data.note.trim()) {
      throw new Error("Une raison est obligatoire pour refuser un restaurant.");
    }

    const newStatus = data.action === "approve" ? "approved" : "rejected";
    const note = data.note?.trim() || null;

    // Lire l'ancien statut pour l'audit
    const { data: prev } = await supabaseAdmin
      .from("restaurants")
      .select("validation_status")
      .eq("id", data.restaurantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!prev) throw new Error("Restaurant introuvable");

    const update = {
      validation_status: newStatus,
      validation_note: note,
      validated_by: context.userId,
      validated_at: new Date().toISOString(),
      is_active: newStatus === "approved",
    };

    const { error: updErr } = await supabaseAdmin
      .from("restaurants")
      .update(update)
      .eq("id", data.restaurantId);
    if (updErr) throw new Error(updErr.message);

    // Audit log manuel
    await supabaseAdmin.from("audit_logs").insert({
      action: `restaurant.${newStatus}`,
      target_table: "restaurants",
      target_id: data.restaurantId,
      restaurant_id: data.restaurantId,
      actor_id: context.userId,
      actor_role: "admin",
      metadata: {
        previous_status: (prev as any).validation_status,
        new_status: newStatus,
        note,
      },
    });

    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", data.restaurantId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Email au propriétaire — awaited inline.
    try {
      const { sendEmail, getRestaurantOwnerEmail } = await import("@/server/email.functions");
      const owner = await getRestaurantOwnerEmail(data.restaurantId);
      if (owner.email) {
        const restaurant_name = (row as any)?.name ?? "Votre restaurant";
        if (newStatus === "approved") {
          await sendEmail({
            to: owner.email, template: "restaurant_approved",
            related_id: data.restaurantId, user_id: owner.user_id,
            data: { restaurant_name },
          });
        } else {
          await sendEmail({
            to: owner.email, template: "restaurant_rejected",
            related_id: `${data.restaurantId}-rejected`, user_id: owner.user_id,
            data: { restaurant_name, reason: note },
          });
        }
      }
    } catch (e) { console.error("[moderateRestaurant email] failed", e); }

    return { restaurant: row };
  });


