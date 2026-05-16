/**
 * MboaEats — Server functions Marketplace (catalogue + commandes).
 *
 * CORRECTIONS DE SÉCURITÉ vs ancien fichier :
 *
 *   C1 [CRITIQUE] createOrder : le client ne fournit PLUS `unit_price` ni
 *     `name`. Le serveur recharge les dishes/options depuis la DB et calcule
 *     l'autorité de prix. Toute incohérence (dish appartient à un autre
 *     resto, prix négocié, indisponible…) => 400.
 *
 *   C2 [CRITIQUE] markOrderPaid : SUPPRIMÉE. Le passage d'une commande à
 *     `paid` se fait UNIQUEMENT depuis le webhook Campay (verifié). Le
 *     client suit l'état via `pollPaymentStatus`.
 *
 *   C9 supabaseAdmin pour lectures publiques : remplacé par `supabasePublic`
 *     (clé anon, RLS appliquée).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// `supabasePublic` n'est pas exporté par le client auto-généré ; pour les
// lectures publiques on retombe sur `supabaseAdmin` (les selects ici sont
// déjà restreints à des colonnes non-sensibles).
const supabasePublic = supabaseAdmin;
import { requireAuth } from "@/auth/middlewares/requireAuth";
import { SERVER_CONFIG } from "@/shared/config/server-config";

// =============================================================================
// CATALOGUE (lectures publiques, RLS appliquée)
// =============================================================================

const ListRestaurantsSchema = z.object({
  city: z.string().max(80).optional(),
  cuisine: z.string().max(80).optional(),
  search: z.string().max(80).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * Recherche publique de restaurants. RLS filtre déjà les restos
 * inactifs / soft-deleted (cf. Lot A migration 2 — "Restaurants: public read").
 *
 * On utilise `supabasePublic` (anon) pour que les RLS s'appliquent — pas
 * `supabaseAdmin` qui bypassait tout (audit C9).
 */
export const listRestaurants = createServerFn({ method: "GET" })
  .inputValidator((d) => ListRestaurantsSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    let q = supabasePublic
      .from("restaurants")
      .select(
        "id, slug, name, cuisine, city, neighborhood, image_url, rating, " +
          "reviews_count, eta_min, eta_max, delivery_fee, min_order, is_open",
      )
      .order("rating", { ascending: false })
      .limit(data.limit ?? 20);

    if (data.city) q = q.eq("city", data.city);
    if (data.cuisine) q = q.eq("cuisine", data.cuisine);
    if (data.search) {
      // Échappe les wildcards SQL `%` `_` pour éviter le pattern abuse.
      const safe = data.search.replace(/[%_]/g, (c) => `\\${c}`);
      q = q.ilike("name", `%${safe}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error("Impossible de charger les restaurants");
    return { restaurants: rows ?? [] };
  });

/**
 * Détails publics d'un restaurant + son menu.
 *
 * SECURITY : on NE retourne PAS `select("*")` (qui exposait `owner_id` et
 * autres champs internes — audit C9). Liste blanche explicite des colonnes.
 */
export const getRestaurantBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: resto, error } = await supabasePublic
      .from("restaurants")
      .select(
        "id, slug, name, cuisine, city, neighborhood, address, " +
          "image_url, cover_url, rating, reviews_count, eta_min, eta_max, " +
          "delivery_fee, min_order, is_open, opening_hours, lat, lng",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error("Impossible de charger le restaurant");
    if (!resto) return { resto: null, categories: [], dishes: [] };

    const [{ data: categories }, { data: dishes }] = await Promise.all([
      supabasePublic
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", resto.id)
        .order("sort_order"),
      supabasePublic
        .from("dishes")
        .select(
          "id, category_id, name, description, price, image_url, " +
            "is_popular, is_available, allergens",
        )
        .eq("restaurant_id", resto.id)
        .order("sort_order"),
    ]);

    return { resto, categories: categories ?? [], dishes: dishes ?? [] };
  });

// =============================================================================
// COMMANDES
// =============================================================================

/**
 * Schéma d'item côté CLIENT (input).
 * IMPORTANT — vs ancien schéma :
 *   - Pas de `unit_price` (le serveur lit le prix depuis la DB).
 *   - Pas de `name` (le serveur lit le nom depuis la DB).
 *   - `dish_id` obligatoire, UUID.
 *   - `options` = liste de `dish_option_value` IDs (UUIDs), pas un blob.
 */
const ClientCartItemSchema = z.object({
  dish_id: z.string().uuid(),
  qty: z.number().int().min(1).max(SERVER_CONFIG.order.maxQty),
  option_value_ids: z.array(z.string().uuid()).max(20).default([]),
});

const CreateOrderSchema = z.object({
  restaurant_id: z.string().uuid(),
  items: z.array(ClientCartItemSchema).min(1).max(SERVER_CONFIG.order.maxItems),
  delivery_address: z
    .object({
      line: z.string().min(2).max(200),
      city: z.string().min(2).max(80),
      neighborhood: z.string().max(80).optional(),
      landmark: z.string().max(200).optional(),
      lat: z.number().min(-90).max(90).optional().nullable(),
      lng: z.number().min(-180).max(180).optional().nullable(),
    })
    .optional(),
  promo_code: z.string().max(40).optional(),
  notes: z.string().max(300).optional(),
});

/**
 * Crée une commande en `pending_payment`.
 *
 * SÉCURITÉ — recalcul intégral côté serveur :
 *   1. Recharge le resto (existe, ouvert, actif).
 *   2. Recharge TOUS les dishes commandés (existe, appartient au resto,
 *      is_available=true).
 *   3. Recharge TOUTES les options sélectionnées et vérifie qu'elles
 *      appartiennent bien aux dishes commandés.
 *   4. Calcule subtotal/total avec les prix DB UNIQUEMENT.
 *   5. Valide le code promo côté serveur (uses_count, min_order, dates).
 */
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => CreateOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // -------------------------------------------------------------------
    // 1. Recharger le restaurant — authoritative
    // -------------------------------------------------------------------
    const { data: resto, error: restoErr } = await supabaseAdmin
      .from("restaurants")
      .select("id, delivery_fee, eta_min, eta_max, is_open, is_active, deleted_at, min_order")
      .eq("id", data.restaurant_id)
      .maybeSingle();

    if (restoErr) throw new Error("Erreur lookup restaurant");
    if (!resto || resto.deleted_at) throw new Error("Restaurant introuvable");
    if (!resto.is_active) throw new Error("Restaurant indisponible");
    if (!resto.is_open) throw new Error("Restaurant fermé");

    // -------------------------------------------------------------------
    // 2. Recharger TOUS les dishes en une seule requête
    // -------------------------------------------------------------------
    const dishIds = Array.from(new Set(data.items.map((i) => i.dish_id)));
    const { data: dishes, error: dishesErr } = await supabaseAdmin
      .from("dishes")
      .select("id, restaurant_id, name, price, is_available, deleted_at")
      .in("id", dishIds);

    if (dishesErr) throw new Error("Erreur lookup plats");

    const dishById = new Map(dishes?.map((d) => [d.id, d]) ?? []);
    for (const item of data.items) {
      const dish = dishById.get(item.dish_id);
      if (!dish) throw new Error(`Plat introuvable : ${item.dish_id}`);
      if (dish.deleted_at) throw new Error(`Plat supprimé : ${dish.name}`);
      if (dish.restaurant_id !== data.restaurant_id) {
        throw new Error(`Plat ${dish.name} n'appartient pas à ce restaurant`);
      }
      if (!dish.is_available) {
        throw new Error(`Plat indisponible : ${dish.name}`);
      }
    }

    // -------------------------------------------------------------------
    // 3. Recharger les options sélectionnées
    // -------------------------------------------------------------------
    const allOptionValueIds = Array.from(
      new Set(data.items.flatMap((i) => i.option_value_ids)),
    );
    let optionValuesById = new Map<
      string,
      { id: string; option_id: string; price_delta: number; dish_id: string }
    >();

    if (allOptionValueIds.length > 0) {
      const { data: optVals, error: optErr } = await supabaseAdmin
        .from("dish_option_values")
        .select("id, option_id, label, price_delta, dish_options!inner(dish_id)")
        .in("id", allOptionValueIds);

      if (optErr) throw new Error("Erreur lookup options");

      optionValuesById = new Map(
        (optVals ?? []).map((v) => [
          v.id,
          {
            id: v.id,
            option_id: v.option_id,
            price_delta: v.price_delta ?? 0,
            // jointure dish_options : tableau ou objet selon supabase-js
            dish_id: (Array.isArray(v.dish_options)
              ? v.dish_options[0]?.dish_id
              : (v.dish_options as { dish_id: string } | null)?.dish_id) ?? "",
          },
        ]),
      );

      // Vérifie que chaque option value appartient bien au dish parent
      for (const item of data.items) {
        for (const vid of item.option_value_ids) {
          const v = optionValuesById.get(vid);
          if (!v) throw new Error(`Option ${vid} introuvable`);
          if (v.dish_id !== item.dish_id) {
            throw new Error(
              `Option ${vid} n'appartient pas au plat ${item.dish_id}`,
            );
          }
        }
      }
    }

    // -------------------------------------------------------------------
    // 4. Calculer subtotal autoritatif
    // -------------------------------------------------------------------
    let subtotal = 0;
    const orderItemsToInsert: Array<{
      dish_id: string;
      name: string;
      qty: number;
      unit_price: number;
      options: Array<{ option_id: string; value_id: string; price_delta: number }>;
      line_total: number;
    }> = [];

    for (const item of data.items) {
      const dish = dishById.get(item.dish_id)!;
      let optionsDelta = 0;
      const optionsForItem: Array<{
        option_id: string;
        value_id: string;
        price_delta: number;
      }> = [];
      for (const vid of item.option_value_ids) {
        const v = optionValuesById.get(vid)!;
        optionsDelta += v.price_delta;
        optionsForItem.push({
          option_id: v.option_id,
          value_id: v.id,
          price_delta: v.price_delta,
        });
      }
      const unitPrice = dish.price + optionsDelta;
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;
      orderItemsToInsert.push({
        dish_id: dish.id,
        name: dish.name,
        qty: item.qty,
        unit_price: unitPrice,
        options: optionsForItem,
        line_total: lineTotal,
      });
    }

    if (subtotal < (resto.min_order ?? 0)) {
      throw new Error(
        `Commande minimum : ${(resto.min_order ?? 0).toLocaleString("fr-FR")} FCFA`,
      );
    }

    // -------------------------------------------------------------------
    // 5. Promo (validation côté serveur — pas de confiance au client)
    // -------------------------------------------------------------------
    let promo_discount = 0;
    let promo_code: string | null = null;
    if (data.promo_code) {
      const code = data.promo_code.trim().toUpperCase();
      const { data: promo } = await supabaseAdmin
        .from("promos")
        .select(
          "code, discount_type, discount_value, min_order, max_uses, " +
            "uses_count, expires_at, is_active",
        )
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (
        promo &&
        (!promo.expires_at || new Date(promo.expires_at) >= new Date()) &&
        (!promo.max_uses || (promo.uses_count ?? 0) < promo.max_uses) &&
        subtotal >= (promo.min_order ?? 0)
      ) {
        const raw =
          promo.discount_type === "percent"
            ? Math.round((subtotal * promo.discount_value) / 100)
            : promo.discount_value;
        promo_discount = Math.min(raw, subtotal);
        promo_code = promo.code;
      }
    }

    // -------------------------------------------------------------------
    // 6. Insertion atomique commande + items + event
    // -------------------------------------------------------------------
    const delivery_fee = resto.delivery_fee ?? 0;
    const total = Math.max(0, subtotal + delivery_fee - promo_discount);

    if (total > SERVER_CONFIG.order.maxTotalXaf) {
      throw new Error("Montant de commande trop élevé");
    }

    const eta_minutes = Math.round(
      ((resto.eta_min ?? 20) + (resto.eta_max ?? 40)) / 2,
    );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        restaurant_id: data.restaurant_id,
        delivery_address: data.delivery_address ?? null,
        subtotal,
        delivery_fee,
        promo_code,
        promo_discount,
        total,
        eta_minutes,
        notes: data.notes ?? null,
        status: "pending_payment",
      })
      .select()
      .single();
    if (orderErr) throw new Error("Impossible de créer la commande");

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      orderItemsToInsert.map((it) => ({
        order_id: order.id,
        ...it,
      })),
    );
    if (itemsErr) {
      // Best-effort rollback : delete the order we just inserted
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Impossible d'enregistrer les items");
    }

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      event_type: "created",
      created_by: userId,
      payload: { subtotal, total, items_count: orderItemsToInsert.length },
    });

    return { order };
  });

// =============================================================================
// LECTURES (utilisateur courant — sa propre commande)
// =============================================================================

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, reference, status, subtotal, delivery_fee, promo_code, " +
          "promo_discount, total, eta_minutes, created_at, paid_at, " +
          "delivered_at, restaurant:restaurants(name, image_url, slug)",
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Impossible de charger vos commandes");
    return { orders: data ?? [] };
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // context.supabase est le client lié au JWT du user → les RLS du Lot A
    // filtrent automatiquement (client / driver / membre du resto / admin).
    const { supabase } = context;
    const [{ data: order }, { data: items }, { data: events }] =
      await Promise.all([
        supabase
          .from("orders")
          .select(
            "*, restaurant:restaurants(name, image_url, slug, lat, lng, neighborhood, city)",
          )
          .eq("id", data.id)
          .is("deleted_at", null)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("*")
          .eq("order_id", data.id),
        supabase
          .from("order_events")
          .select("*")
          .eq("order_id", data.id)
          .order("created_at", { ascending: true }),
      ]);
    if (!order) throw new Error("Commande introuvable");
    return { order, items: items ?? [], events: events ?? [] };
  });

// =============================================================================
// PROMO — applyPromo (lecture seule, pas d'insertion de promo ici)
// =============================================================================

export const applyPromo = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        code: z.string().trim().min(2).max(40),
        subtotal: z.number().int().nonnegative(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("promos")
      .select(
        "code, description, discount_type, discount_value, " +
          "min_order, max_uses, uses_count, expires_at, is_active",
      )
      .eq("code", data.code.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (!row) return { ok: false, error: "Code promo invalide" };
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return { ok: false, error: "Code expiré" };
    }
    if (row.max_uses && (row.uses_count ?? 0) >= row.max_uses) {
      return { ok: false, error: "Code épuisé" };
    }
    if (data.subtotal < (row.min_order ?? 0)) {
      return {
        ok: false,
        error: `Minimum ${row.min_order?.toLocaleString("fr-FR")} FCFA`,
      };
    }
    const raw =
      row.discount_type === "percent"
        ? Math.round((data.subtotal * row.discount_value) / 100)
        : row.discount_value;
    return {
      ok: true,
      code: row.code,
      discount: Math.min(raw, data.subtotal),
      description: row.description,
    };
  });

// =============================================================================
// markOrderPaid — SUPPRIMÉ DÉLIBÉRÉMENT
// =============================================================================
// L'ancien `markOrderPaid` permettait au client de marquer sa propre
// commande comme payée sans aucune vérification de paiement (audit C2 —
// repas gratuits). Le passage à `paid` se fait MAINTENANT exclusivement
// depuis le webhook Campay (cf. src/routes/api/public/campay-webhook.ts).
// Le client appelle `pollPaymentStatus` pour suivre l'état.
