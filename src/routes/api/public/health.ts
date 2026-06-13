import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const checks: Record<string, { ok: boolean; ms: number; error?: string }> = {};

        const t0 = performance.now();
        try {
          const { error } = await supabaseAdmin
            .from("restaurants")
            .select("id", { head: true, count: "exact" })
            .limit(1);
          checks.database = {
            ok: !error,
            ms: Math.round(performance.now() - t0),
            error: error?.message,
          };
        } catch (e: any) {
          checks.database = { ok: false, ms: Math.round(performance.now() - t0), error: e.message };
        }

        const t1 = performance.now();
        try {
          const { error } = await supabaseAdmin
            .from("rate_limits")
            .select("id", { head: true })
            .limit(1);
          checks.rate_limits = {
            ok: !error,
            ms: Math.round(performance.now() - t1),
            error: error?.message,
          };
        } catch (e: any) {
          checks.rate_limits = {
            ok: false,
            ms: Math.round(performance.now() - t1),
            error: e.message,
          };
        }

        const allOk = Object.values(checks).every((c) => c.ok);

        return new Response(
          JSON.stringify({
            status: allOk ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            checks,
          }),
          {
            status: allOk ? 200 : 503,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
          },
        );
      },
    },
  },
});
