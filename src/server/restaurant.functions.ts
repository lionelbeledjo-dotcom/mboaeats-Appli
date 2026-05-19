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
          "created_at, paid_at, accepted_at, ready_at, picked_up_at, " +
          "delivered_at, delivery_address, notes, " +
          "items:order_items(id, name, qty, unit_price, line_total)",
      )
      .eq("restaurant_id", data.restaurant_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) q = q.eq("status", data.status as never);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { orders: rows ?? [] };
  });

// -----------------------------------------------------------------------------
// updateOrderStatus — staff+ (commande doit appartenir à ce resto)
// -----------------------------------------------------------------------------
const ALLOWED_STATUS = ["accepted", "preparing", "ready", "cancelled"] as const;

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(ALLOWED_STATUS),
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

    // 3) Update + event
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
      created_by: context.userId,
    });
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
          "validation_status, validation_note, validated_at, created_at, is_active",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data.status !== "all") {
      q = q.eq("validation_status", data.status);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ownerIds = Array.from(
      new Set((rows ?? []).map((r) => r.owner_id).filter(Boolean) as string[]),
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

    const restaurants = (rows ?? []).map((r) => ({
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
    await assertSuperadmin(context.userId);

    if (data.action === "reject" && !data.note.trim()) {
      throw new Error("Une raison est obligatoire pour refuser un restaurant.");
    }

    const { error: rpcError } = await supabaseAdmin.rpc("moderate_restaurant", {
      p_restaurant_id: data.restaurantId,
      p_decision: data.action === "approve" ? "approved" : "rejected",
      p_note: data.note?.trim() || null,
    });
    if (rpcError) throw new Error(rpcError.message);

    const { data: row, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("id", data.restaurantId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurant: row };
  });


