/**
 * Server functions — gestion des commissions MboaEats (superadmin)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middlewares/requireAuth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
