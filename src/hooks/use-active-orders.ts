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
 * signed-in user. Refreshes on auth changes and at a low polling cadence so
 * the BottomDock badge stays in sync with delivery status.
 */
export function useActiveOrdersCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (alive) setCount(0);
          return;
        }
        const r = (await getMyOrders()) as { orders: Array<{ status: string }> };
        if (!alive) return;
        setCount((r.orders ?? []).filter((o) => ACTIVE.has(o.status)).length);
      } catch {
        if (alive) setCount(0);
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 30_000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());

    return () => {
      alive = false;
      window.clearInterval(interval);
      sub.subscription.unsubscribe();
    };
  }, []);

  return count;
}
