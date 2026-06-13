import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:lbcloudadmin@gmail.com";

async function signJwt(payload: object, privateKeyBase64: string): Promise<string> {
  const keyData = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const token = `${header}.${body}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(token),
  );
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${token}.${sigStr}`;
}

async function sendWebPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) return;

  const url = new URL(subscription.endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 12;

  const jwt = await signJwt({ aud, exp, sub: VAPID_SUBJECT }, VAPID_PRIVATE_KEY);
  const authorization = `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`;

  await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body: payload,
  });
}

export const sendPushToUser = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      user_id: z.string().uuid(),
      title: z.string().max(200),
      body: z.string().max(500),
      url: z.string().optional(),
      tag: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: subs } = await (supabaseAdmin as any)
      .from("push_subscriptions")
      .select("endpoint, keys")
      .eq("user_id", data.user_id);

    if (!subs?.length) return { sent: 0 };

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url || "/",
      tag: data.tag || "mboaeats",
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        const keys = typeof sub.keys === "string" ? JSON.parse(sub.keys) : sub.keys;
        await sendWebPush({ endpoint: sub.endpoint, keys }, payload);
        sent++;
      } catch {
        await (supabaseAdmin as any).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
    return { sent };
  });

export const notifyOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      order_id: z.string().uuid(),
      status: z.string(),
      user_id: z.string().uuid(),
      driver_id: z.string().uuid().optional(),
      restaurant_name: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const messages: Record<string, { title: string; body: string; target: "client" | "driver" | "both" }> = {
      accepted: { title: "Commande acceptée !", body: `${data.restaurant_name || "Le restaurant"} prépare votre commande.`, target: "client" },
      preparing: { title: "En préparation 🍳", body: "Votre commande est en cours de préparation.", target: "client" },
      ready: { title: "Commande prête ! 📦", body: "Un livreur va bientôt récupérer votre commande.", target: "client" },
      picked_up: { title: "Livreur en route ! 🛵", body: "Votre commande a été récupérée et arrive bientôt.", target: "client" },
      delivering: { title: "Arrivée imminente 📍", body: "Le livreur est proche de votre adresse.", target: "client" },
      delivered: { title: "Bon appétit ! 🎉", body: "Votre commande a été livrée avec succès.", target: "client" },
      cancelled: { title: "Commande annulée ❌", body: "Votre commande a été annulée.", target: "both" },
    };

    const msg = messages[data.status];
    if (!msg) return { sent: 0 };

    const targets: string[] = [];
    if (msg.target === "client" || msg.target === "both") targets.push(data.user_id);
    if ((msg.target === "driver" || msg.target === "both") && data.driver_id) targets.push(data.driver_id);

    let totalSent = 0;
    for (const uid of targets) {
      const payload = JSON.stringify({
        title: msg.title,
        body: msg.body,
        url: `/suivi/${data.order_id}`,
        tag: `order-${data.order_id}`,
      });

      const { data: subs } = await (supabaseAdmin as any)
        .from("push_subscriptions")
        .select("endpoint, keys")
        .eq("user_id", uid);

      for (const sub of subs ?? []) {
        try {
          const keys = typeof sub.keys === "string" ? JSON.parse(sub.keys) : sub.keys;
          await sendWebPush({ endpoint: sub.endpoint, keys }, payload);
          totalSent++;
        } catch {
          await (supabaseAdmin as any).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return { sent: totalSent };
  });

export const notifyNewMission = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      order_id: z.string().uuid(),
      restaurant_name: z.string(),
      delivery_fee: z.number(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: drivers } = await supabaseAdmin
      .from("driver_locations")
      .select("driver_id")
      .eq("status", "available");

    if (!drivers?.length) return { sent: 0 };

    const payload = JSON.stringify({
      title: "Nouvelle mission ! 🚀",
      body: `${data.restaurant_name} — ${data.delivery_fee.toLocaleString("fr-FR")} FCFA`,
      url: "/livreur",
      tag: `mission-${data.order_id}`,
    });

    let sent = 0;
    for (const driver of drivers) {
      const { data: subs } = await (supabaseAdmin as any)
        .from("push_subscriptions")
        .select("endpoint, keys")
        .eq("user_id", driver.driver_id);

      for (const sub of subs ?? []) {
        try {
          const keys = typeof sub.keys === "string" ? JSON.parse(sub.keys) : sub.keys;
          await sendWebPush({ endpoint: sub.endpoint, keys }, payload);
          sent++;
        } catch {
          await (supabaseAdmin as any).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
    return { sent };
  });
