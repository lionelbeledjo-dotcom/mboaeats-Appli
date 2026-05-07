import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Favoris ────────────────────────────────────────────────────────────────
export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorites")
      .select("restaurant_id, restaurants(id, slug, name, cuisine, city, image_url, rating, eta_min, eta_max, delivery_fee)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { favorites: data ?? [] };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restaurantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("restaurant_id", data.restaurantId)
      .maybeSingle();
    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      return { favorited: false };
    }
    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, restaurant_id: data.restaurantId });
    if (error) throw new Error(error.message);
    return { favorited: true };
  });

export const isFavorite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ restaurantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("favorites")
      .select("id")
      .eq("user_id", context.userId)
      .eq("restaurant_id", data.restaurantId)
      .maybeSingle();
    return { favorited: !!row };
  });

// ─── Avis ───────────────────────────────────────────────────────────────────
const reviewSchema = z.object({
  restaurantId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("restaurant_reviews").insert({
      user_id: userId,
      restaurant_id: data.restaurantId,
      order_id: data.orderId,
      rating: data.rating,
      comment: data.comment ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReviews = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ restaurantId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("restaurant_reviews")
      .select("id, rating, comment, created_at")
      .eq("restaurant_id", data.restaurantId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { reviews: rows ?? [] };
  });
