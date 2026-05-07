import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyOrders } from "@/server/marketplace.functions";

const ACTIVE = new Set([
  "pending_payment",
  "paid",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "delivering",
]);

/**
 * Returns the number of orders currently in an "in progress" state for the
 * signed-in user, plus a loading flag that is true during the initial fetch
 * and while the Realtime channel is (re)connecting.
 */
export function useActiveOrdersCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (alive) {
            setCount(0);
            setLoading(false);
          }
          return;
        }
        const r = (await getMyOrders()) as { orders: Array<{ status: string }> };
        if (!alive) return;
        setCount((r.orders ?? []).filter((o) => ACTIVE.has(o.status)).length);
      } catch {
        if (alive) setCount(0);
      } finally {
        if (alive) setLoading(false);
      }
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      if (alive) setLoading(true);
      channel = supabase
        .channel(`orders-active-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          () => refresh(),
        )
        .subscribe((status) => {
          if (!alive) return;
          if (status === "SUBSCRIBED") {
            refresh();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            // Reconnecting — surface the loading state on the badge
            setLoading(true);
          }
        });
    };

    refresh();
    setupRealtime();
    const interval = window.setInterval(refresh, 60_000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      refresh();
      setupRealtime();
    });

    return () => {
      alive = false;
      window.clearInterval(interval);
      sub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { count, loading };
}
