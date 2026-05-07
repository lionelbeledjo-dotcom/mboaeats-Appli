import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NotifRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

const PERM_KEY = "mboa_notif_perm_asked";

export function useNotifications() {
  const [items, setItems] = useState<NotifRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      setUserId(data.user.id);

      const { data: rows } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      const list = (rows ?? []) as NotifRow[];
      setItems(list);
      setUnread(list.filter((n) => !n.read_at).length);

      channel = supabase
        .channel(`notif-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` },
          (payload) => {
            const n = payload.new as NotifRow;
            setItems((prev) => [n, ...prev].slice(0, 50));
            setUnread((u) => u + 1);
            // Toast in-app
            toast(n.title, { description: n.body ?? undefined });
            // Browser notif
            try {
              if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
                new Notification(n.title, { body: n.body ?? "", icon: "/icon-512.png", tag: n.id });
              }
            } catch {}
            // Sound
            try {
              if (!audioRef.current) {
                audioRef.current = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
              }
              audioRef.current.play().catch(() => {});
            } catch {}
          },
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      try { localStorage.setItem(PERM_KEY, "1"); } catch {}
    } catch {}
  };

  const markAllRead = async () => {
    if (!userId) return;
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnread(0);
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  return { items, unread, permission, requestPermission, markAllRead, markRead };
}
