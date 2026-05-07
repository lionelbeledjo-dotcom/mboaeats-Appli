import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LiveOrder = {
  id: string;
  status: string;
  eta_minutes: number | null;
  paid_at: string | null;
  accepted_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
};

export type LiveEvent = {
  id: string;
  order_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export function useRealtimeOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<LiveOrder | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    (async () => {
      const [{ data: o }, { data: ev }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase
          .from("order_events")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (o) setOrder(o as LiveOrder);
      if (ev) setEvents(ev as LiveEvent[]);
    })();

    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new as LiveOrder)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` },
        (payload) => setEvents((p) => [...p, payload.new as LiveEvent])
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { order, events };
}
