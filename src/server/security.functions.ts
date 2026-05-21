/**
 * MboaEats — Pack Sécurité MVP
 * Server functions pour la console /superadmin/securite.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAuth } from "@/auth/middlewares/requireAuth";

async function assertSuperadmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "superadmin"]);
  if (error || !data || data.length === 0) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export const listLoginAttempts = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        window: z.enum(["24h", "7d", "all"]).default("24h"),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d ?? {})
  )
  .handler(async ({ context, data }) => {
    await assertSuperadmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("login_attempts")
      .select("id, email, ip_address, success, user_agent, attempted_at")
      .order("attempted_at", { ascending: false })
      .limit(data.limit);

    if (data.window === "24h") {
      q = q.gte("attempted_at", new Date(Date.now() - 24 * 3600_000).toISOString());
    } else if (data.window === "7d") {
      q = q.gte("attempted_at", new Date(Date.now() - 7 * 24 * 3600_000).toISOString());
    }

    const { data: rowsRaw, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (rowsRaw ?? []).map((r: any) => ({
      id: r.id as string,
      email: r.email as string,
      ip_address: r.ip_address == null ? null : String(r.ip_address),
      success: r.success as boolean,
      user_agent: (r.user_agent as string | null) ?? null,
      attempted_at: r.attempted_at as string,
    }));

    // Stats 24h
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count: failed24h } = await supabaseAdmin
      .from("login_attempts")
      .select("id", { head: true, count: "exact" })
      .eq("success", false)
      .gte("attempted_at", since24h);

    // Comptes verrouillés actuellement : emails avec >=5 échecs dans les 5 dernières min
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: recentFails } = await supabaseAdmin
      .from("login_attempts")
      .select("email, attempted_at")
      .eq("success", false)
      .gte("attempted_at", fiveMinAgo);

    const counts = new Map<string, { count: number; oldest: string }>();
    for (const r of recentFails ?? []) {
      const cur = counts.get(r.email);
      if (cur) {
        cur.count += 1;
        if (r.attempted_at < cur.oldest) cur.oldest = r.attempted_at;
      } else {
        counts.set(r.email, { count: 1, oldest: r.attempted_at });
      }
    }
    const locked = Array.from(counts.entries())
      .filter(([, v]) => v.count >= 5)
      .map(([email, v]) => ({ email, failures: v.count, since: v.oldest }));

    return {
      attempts: rows ?? [],
      stats: {
        failed_24h: failed24h ?? 0,
        locked_count: locked.length,
      },
      locked,
    };
  });

export const unlockAccount = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { data: deleted, error } = await supabaseAdmin.rpc("unlock_account", {
      p_email: data.email,
    });
    if (error) throw new Error(error.message);
    return { ok: true, deleted: deleted ?? 0 };
  });
