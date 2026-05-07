import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Catalogue (lecture publique) ────────────────────────────────────────────
export const listRestaurants = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z
      .object({
        city: z.string().optional(),
        cuisine: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(d ?? {})
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("restaurants")
      .select(
        "id, slug, name, cuisine, city, neighborhood, image_url, rating, reviews_count, eta_min, eta_max, delivery_fee, min_order, is_open"
      )
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .limit(data.limit ?? 20);
    if (data.city) q = q.eq("city", data.city);
    if (data.cuisine) q = q.eq("cuisine", data.cuisine);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { restaurants: rows ?? [] };
  });

export const getRestaurantBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(80) }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: resto, error } = await supabaseAdmin
      .from("restaurants")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!resto) return { resto: null, categories: [], dishes: [] };

    const [{ data: categories }, { data: dishes }] = await Promise.all([
      supabaseAdmin
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", resto.id)
        .order("sort_order"),
      supabaseAdmin
        .from("dishes")
        .select(
          "id, category_id, name, description, price, image_url, is_popular, is_available"
        )
        .eq("restaurant_id", resto.id)
        .eq("is_available", true)
        .order("sort_order"),
    ]);

    return { resto, categories: categories ?? [], dishes: dishes ?? [] };
  });

// ─── Promo ───────────────────────────────────────────────────────────────────
export const applyPromo = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        code: z.string().trim().min(2).max(40),
        subtotal: z.number().int().nonnegative(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("promos")
      .select("*")
      .eq("code", data.code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (!row) return { ok: false, error: "Code promo invalide" };
    if (row.expires_at && new Date(row.expires_at) < new Date())
      return { ok: false, error: "Code expiré" };
    if (row.max_uses && (row.uses_count ?? 0) >= row.max_uses)
      return { ok: false, error: "Code épuisé" };
    if (data.subtotal < (row.min_order ?? 0))
      return {
        ok: false,
        error: `Minimum ${row.min_order?.toLocaleString("fr-FR")} FCFA`,
      };
    const discount =
      row.discount_type === "percent"
        ? Math.round((data.subtotal * row.discount_value) / 100)
        : row.discount_value;
    return {
      ok: true,
      code: row.code,
      discount: Math.min(discount, data.subtotal),
      description: row.description,
    };
  });

// ─── Commandes ───────────────────────────────────────────────────────────────
const CartItem = z.object({
  dish_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(120),
  qty: z.number().int().min(1).max(50),
  unit_price: z.number().int().nonnegative(),
  options: z.array(z.any()).optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        items: z.array(CartItem).min(1).max(50),
        delivery_address: z
          .object({
            line: z.string().min(2).max(200),
            city: z.string().min(2).max(80),
            neighborhood: z.string().max(80).optional(),
            landmark: z.string().max(200).optional(),
          })
          .optional(),
        promo_code: z.string().max(40).optional(),
        notes: z.string().max(300).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: resto } = await supabaseAdmin
      .from("restaurants")
      .select("id, delivery_fee, eta_min, eta_max, is_open")
      .eq("id", data.restaurant_id)
      .maybeSingle();
    if (!resto) throw new Error("Restaurant introuvable");
    if (!resto.is_open) throw new Error("Restaurant fermé");

    const subtotal = data.items.reduce(
      (s, i) => s + i.qty * i.unit_price,
      0
    );
    let promo_discount = 0;
    let promo_code: string | null = null;
    if (data.promo_code) {
      const { data: row } = await supabaseAdmin
        .from("promos")
        .select("*")
        .eq("code", data.promo_code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();
      if (row && subtotal >= (row.min_order ?? 0)) {
        promo_discount =
          row.discount_type === "percent"
            ? Math.round((subtotal * row.discount_value) / 100)
            : row.discount_value;
        promo_discount = Math.min(promo_discount, subtotal);
        promo_code = row.code;
      }
    }
    const delivery_fee = resto.delivery_fee ?? 0;
    const total = Math.max(0, subtotal + delivery_fee - promo_discount);
    const eta_minutes = Math.round(
      ((resto.eta_min ?? 20) + (resto.eta_max ?? 40)) / 2
    );

    const { data: order, error } = await supabaseAdmin
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
    if (error) throw new Error(error.message);

    const itemsRows = data.items.map((i) => ({
      order_id: order.id,
      dish_id: i.dish_id ?? null,
      name: i.name,
      qty: i.qty,
      unit_price: i.unit_price,
      options: i.options ?? [],
      line_total: i.qty * i.unit_price,
    }));
    await supabaseAdmin.from("order_items").insert(itemsRows);
    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      event_type: "created",
      created_by: userId,
    });

    return { order };
  });

export const markOrderPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        payment_reference: z.string().min(2).max(120),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.user_id !== userId) throw new Error("Commande introuvable");

    await supabaseAdmin
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", data.order_id);
    await supabaseAdmin.from("order_events").insert({
      order_id: data.order_id,
      event_type: "paid",
      payload: { reference: data.payment_reference },
      created_by: userId,
    });

    // Auto-progression de démo (resto accepte sous 30s)
    setTimeout(() => {
      void supabaseAdmin
        .from("orders")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", data.order_id)
        .then(() =>
          supabaseAdmin.from("order_events").insert({
            order_id: data.order_id,
            event_type: "accepted",
          })
        );
    }, 8000);

    return { ok: true };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, reference, status, subtotal, delivery_fee, promo_code, promo_discount, total, eta_minutes, created_at, paid_at, delivered_at, restaurant:restaurants(name, image_url, slug)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: order }, { data: items }, { data: events }] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "*, restaurant:restaurants(name, image_url, slug, lat, lng, neighborhood, city)"
        )
        .eq("id", data.id)
        .maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", data.id),
      supabase
        .from("order_events")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    if (!order) throw new Error("Commande introuvable");
    return { order, items: items ?? [], events: events ?? [] };
  });
