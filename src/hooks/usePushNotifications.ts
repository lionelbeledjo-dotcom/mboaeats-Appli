import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      await subscribe();
      return true;
    }
    return false;
  }

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await (supabase as any).from("push_subscriptions").upsert({
          user_id: user.user.id,
          endpoint: sub.endpoint,
          keys: JSON.stringify(sub.toJSON().keys),
          created_at: new Date().toISOString(),
        }, { onConflict: "endpoint" });
      }
      setSubscribed(true);
    } catch {
      // Push non supporte
    }
  }

  return { permission, subscribed, requestPermission };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
