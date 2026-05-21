/**
 * Server functions — gestion des commissions MboaEats (superadmin)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middlewares/requireAuth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertMembership } from "@/auth/middlewares/requireMembership";

async function assertSuperadmin(userId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (!data) throw new Error("Accès réservé au superadmin");
}

// -----------------------------------------------------------------------------
// Lecture : taux global + stats restos
// -----------------------------------------------------------------------------
export const getCommissionOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context.userId);

    const { data: row } = await supabaseAdmin
      .from("commissions")
      .select("rate_pct, notes, updated_at")
      .eq("category", "default")
      .maybeSingle();

    const { data: allRestos } = await supabaseAdmin
      .from("restaurants")
      .select("id, commission_rate")
      .is("deleted_at", null);

    const total = allRestos?.length ?? 0;
    const overrides =
      allRestos?.filter((r) => r.commission_rate !== null).length ?? 0;

    return {
      defaultRate: Number(row?.rate_pct ?? 18),
      notes: row?.notes ?? null,
      updatedAt: row?.updated_at ?? null,
      stats: { total, overrides, atDefault: total - overrides },
    };
  });

// -----------------------------------------------------------------------------
// Update taux global
// -----------------------------------------------------------------------------
export const updateDefaultCommission = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({ rate_pct: z.number().min(0).max(100) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin
      .from("commissions")
      .update({ rate_pct: data.rate_pct })
      .eq("category", "default");
    if (error) throw new Error(error.message);
    return { ok: true, rate_pct: data.rate_pct };
  });

// -----------------------------------------------------------------------------
// Set / reset override pour un restaurant
// -----------------------------------------------------------------------------
export const setRestaurantCommission = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        rate_pct: z.number().min(0).max(100).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.userId);
    const { error } = await supabaseAdmin
      .from("restaurants")
      .update({ commission_rate: data.rate_pct })
      .eq("id", data.restaurant_id);
    if (error) throw new Error(error.message);
    return { ok: true, rate_pct: data.rate_pct };
  });

// -----------------------------------------------------------------------------
// Resto revenue summary par période (utilise les colonnes figées)
// -----------------------------------------------------------------------------



export const getRestaurantRevenue = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        restaurant_id: z.string().uuid(),
        period: z.enum(["today", "7d", "30d", "all"]).default("7d"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertMembership(context, data.restaurant_id, "kitchen");

    let since: Date | null = null;
    const now = new Date();
    if (data.period === "today") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (data.period === "7d") {
      since = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    } else if (data.period === "30d") {
      since = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    }

    let q = supabaseAdmin
      .from("orders")
      .select("subtotal, commission_amount, restaurant_payout")
      .eq("restaurant_id", data.restaurant_id)
      .eq("status", "delivered")
      .is("deleted_at", null);
    if (since) q = q.gte("delivered_at", since.toISOString());

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let totalSales = 0, totalCommission = 0, totalNet = 0;
    for (const r of rows ?? []) {
      totalSales += Number(r.subtotal ?? 0);
      totalCommission += Number(r.commission_amount ?? 0);
      totalNet += Number(r.restaurant_payout ?? 0);
    }
    return {
      ordersCount: rows?.length ?? 0,
      totalSales,
      totalCommission,
      totalNet,
    };
  });
