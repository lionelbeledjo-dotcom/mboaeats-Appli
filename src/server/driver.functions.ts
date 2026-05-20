import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Missions disponibles : commandes prêtes sans livreur assigné.
export const listAvailableMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, reference, status, total, delivery_fee, eta_minutes, delivery_address, created_at, ready_at, restaurant_id, restaurants(name, address, neighborhood, lat, lng)"
      )
      .in("status", ["ready", "preparing", "accepted"])
      .is("driver_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { missions: data ?? [] };
  });

// Commandes assignées au livreur courant (en cours + livrées récentes)
export const listMyMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, reference, status, total, delivery_fee, eta_minutes, delivery_address, created_at, ready_at, picked_up_at, delivered_at, restaurant_id, restaurants(name, address, neighborhood)"
      )
      .eq("driver_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { missions: data ?? [] };
  });

// Le livreur réclame une mission ouverte (admin = bypass RLS pour assigner)
export const claimMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Vérifier que la mission est encore libre
    const { data: existing, error: e1 } = await supabaseAdmin
      .from("orders")
      .select("id, driver_id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!existing) throw new Error("Mission introuvable");
    if (existing.driver_id) throw new Error("Mission déjà attribuée");

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ driver_id: userId })
      .eq("id", data.order_id)
      .is("driver_id", null);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("order_events").insert({
      order_id: data.order_id,
      event_type: "driver_assigned",
      created_by: userId,
    });
    // Email picked_up est envoyé sur updateMissionStatus('picked_up')
    return { ok: true };
  });

const DRIVER_STATUSES = ["picked_up", "delivering", "delivered", "cancelled"] as const;

export const updateMissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum(DRIVER_STATUSES),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const stamp: Record<string, string> = {};
    if (data.status === "picked_up") stamp.picked_up_at = now;
    if (data.status === "delivered") stamp.delivered_at = now;
    if (data.status === "cancelled") stamp.cancelled_at = now;

    const { error } = await supabase
      .from("orders")
      .update({ status: data.status, ...stamp })
      .eq("id", data.order_id)
      .eq("driver_id", userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("order_events").insert({
      order_id: data.order_id,
      event_type: data.status,
      created_by: userId,
    });

    // Emails — awaited inline (Workers tue les promesses détachées).
    try {
      const { sendEmail, getUserEmail } = await import("@/server/email.functions");
      const { data: full } = await supabaseAdmin
        .from("orders")
        .select("id, reference, user_id, restaurants(name)")
        .eq("id", data.order_id).maybeSingle();
      if (full) {
        const row = full as any;
        const reference = row.reference;
        const restaurant_name = row.restaurants?.name ?? "";
        const order_id = row.id;
        if (data.status === "picked_up") {
          const { data: drv } = await supabaseAdmin
            .from("driver_profiles").select("full_name").eq("user_id", userId).maybeSingle();
          const clientEmail = await getUserEmail(row.user_id);
          if (clientEmail) await sendEmail({
            to: clientEmail, template: "order_picked_up_client",
            related_id: order_id, user_id: row.user_id,
            data: { reference, order_id, driver_name: (drv as any)?.full_name },
          });
        } else if (data.status === "delivered") {
          const clientEmail = await getUserEmail(row.user_id);
          if (clientEmail) await sendEmail({
            to: clientEmail, template: "order_delivered_client",
            related_id: `${order_id}-delivered`, user_id: row.user_id,
            data: { reference, order_id, restaurant_name },
          });
        }
      }
    } catch (e) { console.error("[updateMissionStatus email] failed", e); }

    return { ok: true };
  });

// Position GPS du livreur (upsert) — admin pour bypass la policy de role
export const updateMyLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        heading: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
        status: z.enum(["available", "busy", "offline"]).optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.from("driver_locations").upsert(
      {
        driver_id: userId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading ?? null,
        speed: data.speed ?? null,
        status: data.status ?? "available",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id" }
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyDriverState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("driver_locations")
      .select("*")
      .eq("driver_id", userId)
      .maybeSingle();
    return { state: data };
  });

// Gains : agrège les commandes livrées (delivery_fee = part du livreur ici)
export const getMyEarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data, error } = await supabase
      .from("orders")
      .select("id, delivery_fee, total, delivered_at, status")
      .eq("driver_id", userId)
      .eq("status", "delivered")
      .gte("delivered_at", since.toISOString());
    if (error) throw new Error(error.message);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const dayRows = (data ?? []).filter((r) => r.delivered_at && r.delivered_at >= todayIso);
    const earningsToday = dayRows.reduce((s, r) => s + (r.delivery_fee ?? 0), 0);
    const earningsWeek = (data ?? []).reduce((s, r) => s + (r.delivery_fee ?? 0), 0);

    // Histogramme 7 jours
    const buckets: { d: string; v: number }[] = [];
    const labels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const v = (data ?? [])
        .filter((r) => r.delivered_at && r.delivered_at >= day.toISOString() && r.delivered_at < next.toISOString())
        .reduce((s, r) => s + (r.delivery_fee ?? 0), 0);
      buckets.push({ d: labels[day.getDay()], v });
    }

    return {
      earningsToday,
      earningsWeek,
      countToday: dayRows.length,
      countWeek: (data ?? []).length,
      week: buckets,
    };
  });

// Évaluations clients reçues (rating laissé par les clients sur les commandes livrées par ce livreur)
export const getMyDriverReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, reference, restaurant_id, restaurants(name)")
      .eq("driver_id", userId)
      .eq("status", "delivered")
      .limit(200);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length === 0) {
      return { reviews: [], avg: null, count: 0 };
    }
    const { data: reviews } = await supabaseAdmin
      .from("restaurant_reviews")
      .select("id, rating, comment, created_at, order_id")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });
    const list = (reviews ?? []).map((r) => {
      const o = (orders ?? []).find((x) => x.id === r.order_id);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reference: o?.reference ?? "",
        restaurant_name: (o as { restaurants?: { name?: string } } | undefined)?.restaurants?.name ?? "Restaurant",
      };
    });
    const avg = list.length > 0 ? list.reduce((s, r) => s + (r.rating ?? 0), 0) / list.length : null;
    return { reviews: list, avg, count: list.length };
  });

// Étape intermédiaire : le livreur signale son arrivée au restaurant
export const markArrivedAtRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("order_events")
      .insert({
        order_id: data.order_id,
        event_type: "driver_arrived_restaurant",
        created_by: userId,
        payload: { at: new Date().toISOString() },
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Demande de virement des gains vers MTN MoMo / Orange Money
export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        amount_fcfa: z.number().int().positive().max(2_000_000),
        method: z.enum(["mtn_momo", "orange_money"]),
        msisdn: z.string().regex(/^(\+?237)?6\d{8}$/, "Numéro Cameroun invalide"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Vérifie les gains nets disponibles (livraisons livrées 30j - retraits 30j)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [{ data: orders }, { data: payouts }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("delivery_fee, delivered_at")
        .eq("driver_id", userId)
        .eq("status", "delivered")
        .gte("delivered_at", since.toISOString()),
      supabaseAdmin
        .from("payments")
        .select("amount_fcfa, status")
        .eq("user_id", userId)
        .eq("purpose", "driver_payout")
        .in("status", ["pending", "succeeded"]),
    ]);
    const earned = (orders ?? []).reduce((s, r) => s + (r.delivery_fee ?? 0), 0);
    const withdrawn = (payouts ?? []).reduce((s, r) => s + (r.amount_fcfa ?? 0), 0);
    const available = earned - withdrawn;
    if (data.amount_fcfa > available) {
      throw new Error(`Solde insuffisant. Disponible : ${available.toLocaleString("fr-FR")} FCFA`);
    }

    const reference = `PAYOUT-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      provider: data.method === "mtn_momo" ? "mtn" : "orange",
      reference,
      msisdn: data.msisdn,
      amount_fcfa: data.amount_fcfa,
      purpose: "driver_payout",
      status: "pending",
      metadata: { kind: "driver_payout", method: data.method },
    });
    if (error) throw new Error(error.message);

    // Notifier le livreur
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "wallet",
      title: "📤 Demande de virement reçue",
      body: `Votre demande de ${data.amount_fcfa.toLocaleString("fr-FR")} FCFA est en cours de traitement.`,
      data: { reference, amount: data.amount_fcfa, method: data.method },
    });

    return { ok: true, reference, available_after: available - data.amount_fcfa };
  });

// Solde disponible pour retrait
export const getPayoutBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [{ data: orders }, { data: payouts }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("delivery_fee, delivered_at")
        .eq("driver_id", userId)
        .eq("status", "delivered")
        .gte("delivered_at", since.toISOString()),
      supabaseAdmin
        .from("payments")
        .select("amount_fcfa, status, reference, created_at")
        .eq("user_id", userId)
        .eq("purpose", "driver_payout")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const earned = (orders ?? []).reduce((s, r) => s + (r.delivery_fee ?? 0), 0);
    const reserved = (payouts ?? [])
      .filter((p) => p.status === "pending" || p.status === "succeeded")
      .reduce((s, r) => s + (r.amount_fcfa ?? 0), 0);
    return {
      available: Math.max(0, earned - reserved),
      earned_30d: earned,
      payouts: payouts ?? [],
    };
  });
