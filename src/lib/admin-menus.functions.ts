import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ===== Categories =====
export const listMenuCategories = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ restaurant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: cats, error } = await supabaseAdmin
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", data.restaurant_id)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { categories: cats ?? [] };
  });

export const createMenuCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      restaurant_id: z.string().uuid(),
      name: z.string().trim().min(1).max(80),
      sort_order: z.number().int().min(0).max(999).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("menu_categories")
      .insert({ restaurant_id: data.restaurant_id, name: data.name, sort_order: data.sort_order ?? 0 })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { category: row };
  });

export const updateMenuCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(80).optional(),
      sort_order: z.number().int().min(0).max(999).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("menu_categories").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMenuCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    // Detach dishes first to avoid FK issues
    await supabaseAdmin.from("dishes").update({ category_id: null }).eq("category_id", data.id);
    const { error } = await supabaseAdmin.from("menu_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Dishes =====
export const listDishes = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ restaurant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: dishes, error } = await supabaseAdmin
      .from("dishes")
      .select("*")
      .eq("restaurant_id", data.restaurant_id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { dishes: dishes ?? [] };
  });

const dishCore = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.number().int().min(0).max(10_000_000),
  category_id: z.string().uuid().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_available: z.boolean().optional(),
  is_popular: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const createDish = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    dishCore.extend({ restaurant_id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin.from("dishes").insert(data).select("*").single();
    if (error) throw new Error(error.message);
    return { dish: row };
  });

export const updateDish = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    dishCore.partial().extend({ id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("dishes").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDish = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("dishes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Image upload =====
export const uploadDishImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => {
    if (!(d instanceof FormData)) throw new Error("Expected FormData");
    const file = d.get("file");
    const restaurant_id = d.get("restaurant_id");
    if (!(file instanceof File)) throw new Error("Fichier manquant");
    if (typeof restaurant_id !== "string") throw new Error("restaurant_id manquant");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image trop lourde (max 5 Mo)");
    if (!file.type.startsWith("image/")) throw new Error("Format invalide");
    return { file, restaurant_id };
  })
  .handler(async ({ data }) => {
    const { file, restaurant_id } = data;
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${restaurant_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = await file.arrayBuffer();
    const { error } = await supabaseAdmin.storage
      .from("dish-images")
      .upload(path, buf, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("dish-images").getPublicUrl(path);
    return { url: pub.publicUrl, path };
  });
