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

const MAX_RETRIES = 3;

/**
 * Returns the number of orders currently in an "in progress" state for the
 * signed-in user, plus loading and error flags. `error` becomes true when the
 * Realtime channel fails to (re)connect after several attempts.
 */
export function useActiveOrdersCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

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
            retries = 0;
            setError(false);
            refresh();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setLoading(true);
            if (retries >= MAX_RETRIES) {
              setError(true);
              setLoading(false);
              return;
            }
            retries += 1;
            const delay = Math.min(1000 * 2 ** retries, 8000);
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              if (alive) setupRealtime();
            }, delay);
          }
        });
    };

    refresh();
    setupRealtime();
    const interval = window.setInterval(refresh, 60_000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      retries = 0;
      setError(false);
      setLoading(true);
      refresh();
      setupRealtime();
    });

    return () => {
      alive = false;
      window.clearInterval(interval);
      if (retryTimer) clearTimeout(retryTimer);
      sub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { count, loading, error };
}
