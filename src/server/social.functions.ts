import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Favoris ────────────────────────────────────────────────────────────────
export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: favs, error } = await context.supabase
      .from("favorites")
      .select("restaurant_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (favs ?? []).map((f) => f.restaurant_id);
    if (ids.length === 0) return { favorites: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: restos } = await supabaseAdmin
      .from("restaurants")
      .select("id, slug, name, cuisine, city, image_url, rating, eta_min, eta_max, delivery_fee")
      .in("id", ids);
    const map = new Map((restos ?? []).map((r) => [r.id, r]));
    return {
      favorites: (favs ?? []).map((f) => ({
        restaurant_id: f.restaurant_id,
        restaurants: map.get(f.restaurant_id) ?? null,
      })),
    };
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
      .select("id, rating, comment, created_at, user_id")
      .eq("restaurant_id", data.restaurantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean)));
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      for (const p of profs ?? []) {
        if (p.user_id && p.full_name) names.set(p.user_id, p.full_name);
      }
    }
    const reviews = (rows ?? []).map((r) => {
      const full = r.user_id ? names.get(r.user_id) : null;
      const author = full
        ? full.split(" ").map((w, i) => (i === 0 ? w : (w[0] ?? "") + ".")).join(" ")
        : "Client MboaEats";
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        author,
      };
    });
    const avg = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
    return { reviews, avg, count: reviews.length };
  });
