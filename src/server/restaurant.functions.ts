import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Récupère le resto géré par le user courant (premier owner_id matché)
export const getMyRestaurant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurant: data };
  });

export const updateMyRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("restaurants")
      .update(patch)
      .eq("id", id)
      .eq("owner_id", userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { restaurant: row };
  });

// Commandes du resto
export const listRestaurantOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { restaurant_id: string; status?: string }) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        status: z.string().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("orders")
      .select(
        "id, reference, status, total, subtotal, delivery_fee, eta_minutes, created_at, paid_at, accepted_at, ready_at, picked_up_at, delivered_at, delivery_address, notes, items:order_items(id, name, qty, unit_price, line_total)"
      )
      .eq("restaurant_id", data.restaurant_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) q = q.eq("status", data.status as never);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { orders: rows ?? [] };
  });

const ALLOWED_STATUS = [
  "accepted",
  "preparing",
  "ready",
  "cancelled",
] as const;

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(ALLOWED_STATUS),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stamp: Record<string, string> = {};
    const now = new Date().toISOString();
    if (data.status === "accepted") stamp.accepted_at = now;
    if (data.status === "ready") stamp.ready_at = now;
    if (data.status === "cancelled") stamp.cancelled_at = now;
    const { error } = await supabase
      .from("orders")
      .update({ status: data.status, ...stamp })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("order_events").insert({
      order_id: data.order_id,
      event_type: data.status,
      created_by: userId,
    });
    return { ok: true };
  });

// Menu : catégories + plats
export const getRestaurantMenu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { restaurant_id: string }) =>
    z.object({ restaurant_id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [cats, dishes] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", data.restaurant_id)
        .order("sort_order"),
      supabase
        .from("dishes")
        .select("*")
        .eq("restaurant_id", data.restaurant_id)
        .order("sort_order"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (dishes.error) throw new Error(dishes.error.message);
    return { categories: cats.data ?? [], dishes: dishes.data ?? [] };
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        restaurant_id: z.string().uuid(),
        name: z.string().min(1).max(80),
        sort_order: z.number().int().min(0).max(999).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload = {
      restaurant_id: data.restaurant_id,
      name: data.name,
      sort_order: data.sort_order ?? 0,
    };
    const q = data.id
      ? supabase.from("menu_categories").update(payload).eq("id", data.id).select().single()
      : supabase.from("menu_categories").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return { category: row };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("menu_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertDish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        restaurant_id: z.string().uuid(),
        category_id: z.string().uuid().nullable().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).nullable().optional(),
        price: z.number().int().min(0).max(1000000),
        image_url: z.string().url().nullable().optional(),
        is_available: z.boolean().optional(),
        is_popular: z.boolean().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
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
      ? supabase.from("dishes").update(payload).eq("id", data.id).select().single()
      : supabase.from("dishes").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return { dish: row };
  });

export const deleteDish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("dishes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Stats simples
export const getRestaurantStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { restaurant_id: string }) =>
    z.object({ restaurant_id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data: rows, error } = await supabase
      .from("orders")
      .select("id, total, status, created_at")
      .eq("restaurant_id", data.restaurant_id)
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const orders = rows ?? [];
    const delivered = orders.filter((o) => o.status === "delivered");
    const revenue = delivered.reduce((s, o) => s + (o.total ?? 0), 0);
    const inProgress = orders.filter((o) =>
      ["paid", "accepted", "preparing", "ready", "picked_up", "delivering"].includes(
        o.status as string
      )
    ).length;
    return {
      ordersCount: orders.length,
      deliveredCount: delivered.length,
      inProgress,
      revenue,
      avgTicket: delivered.length ? Math.round(revenue / delivered.length) : 0,
    };
  });

// Bootstrap : crée un resto si l'owner n'en a pas encore
export const createMyRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(2).max(120),
        cuisine: z.string().min(2).max(80),
        city: z.string().min(2).max(80),
        neighborhood: z.string().max(80).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
    const { data: row, error } = await supabase
      .from("restaurants")
      .insert({
        owner_id: userId,
        slug,
        name: data.name,
        cuisine: data.cuisine,
        city: data.city,
        neighborhood: data.neighborhood ?? null,
        is_open: true,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { restaurant: row };
  });
