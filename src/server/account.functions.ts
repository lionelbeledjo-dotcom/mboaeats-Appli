import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Profil ──────────────────────────────────────────────────────────────────
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, phone, city, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    return { profile, roles: (roles ?? []).map((r) => r.role) };
  });

export const upsertMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        full_name: z.string().min(1).max(80).optional().nullable(),
        phone: z.string().max(30).optional().nullable(),
        city: z.string().max(60).optional().nullable(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("profiles")
        .insert({ user_id: userId, ...data });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ─── Adresses ────────────────────────────────────────────────────────────────
export const listMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { addresses: data ?? [] };
  });

const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(40).default("Maison"),
  city: z.string().min(1).max(60),
  neighborhood: z.string().max(80).optional().nullable(),
  line: z.string().min(1).max(280),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  is_default: z.boolean().optional(),
});

export const upsertMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => addressSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    }
    if (data.id) {
      const { id, ...patch } = data;
      const { error } = await supabase
        .from("addresses")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id };
    } else {
      const { data: row, error } = await supabase
        .from("addresses")
        .insert({ user_id: userId, ...data })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
  });

export const deleteMyAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDefaultAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Fidélité ────────────────────────────────────────────────────────────────
type Tier = { name: string; from: number };
const TIERS: Tier[] = [
  { name: "Pistache", from: 0 },
  { name: "Soya Boy", from: 800 },
  { name: "Chef Ndolé", from: 2500 },
  { name: "Roi du Mboa", from: 6000 },
];

function tierFor(points: number) {
  let current: Tier = TIERS[0];
  let next: Tier = TIERS[1];
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].from) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? TIERS[i];
    }
  }
  return { current, next };
}

export const getMyLoyalty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data: row } = await supabase
      .from("loyalty_points")
      .select("points, level, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (!row) {
      await supabase.from("loyalty_points").insert({ user_id: userId, points: 0, level: "Pistache" });
      row = { points: 0, level: "Pistache", updated_at: new Date().toISOString() };
    }

    const points = row.points ?? 0;
    const { current, next } = tierFor(points);
    const span = Math.max(1, next.from - current.from);
    const pct = current === next ? 100 : Math.min(100, Math.round(((points - current.from) / span) * 100));

    // Compteur commandes 30 derniers jours
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count: orders30 } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since)
      .in("status", ["delivered", "picked_up", "delivering", "ready"]);

    return {
      points,
      currentTier: current.name,
      nextTier: next.name,
      nextThreshold: next.from,
      pct,
      orders30: orders30 ?? 0,
    };
  });
