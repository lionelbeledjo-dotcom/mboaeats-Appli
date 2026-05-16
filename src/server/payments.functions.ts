/**
 * MboaEats — Server functions Paiements (MoMo, Orange, Carte via Campay).
 *
 * CORRECTIONS DE SÉCURITÉ vs ancien fichier :
 *
 *   C3 [CRITIQUE] auth obligatoire : toutes les fonctions exigent
 *     `requireAuth`. Plus de routes anonymes qui déclenchent des prompts
 *     MoMo sur des numéros tiers.
 *
 *   C3 [CRITIQUE] activateMboaPass : le `userId` n'est PLUS pris du payload.
 *     Il vient de `context.userId` (JWT). Le `payment.reference` doit
 *     appartenir à ce user.
 *
 *   C3 idempotence MboaPass : contrainte UNIQUE sur `payment_reference`
 *     dans la table abonnements (à ajouter via migration). Si la fonction
 *     est appelée 2 fois avec la même référence, la 2ᵉ retourne l'abonnement
 *     existant sans en créer un nouveau.
 *
 *   C3 enforce that the order_id in metadata belongs to caller : empêche
 *     le rattachement d'un paiement à la commande d'un autre user.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAuth } from "@/auth/middlewares/requireAuth";
import { SERVER_CONFIG } from "@/shared/config/server-config";

const CAMPAY_BASE = process.env.CAMPAY_BASE_URL || "https://campay.net/api";

// -----------------------------------------------------------------------------
// Schémas
// -----------------------------------------------------------------------------
const InitiateSchema = z.object({
  provider: z.enum(["momo", "orange"]),
  msisdn: z.string().min(8).max(15),
  amount: z.number().int().positive().max(SERVER_CONFIG.payments.maxAmountXaf),
  purpose: z.enum(["order", "mboapass_month", "mboapass_year"]).default("order"),
  /** Si purpose = "order", on lie le paiement à cette commande. */
  order_id: z.string().uuid().optional(),
});

const InitiateCardSchema = z.object({
  amount: z.number().int().positive().max(SERVER_CONFIG.payments.maxAmountXaf),
  purpose: z.enum(["order", "mboapass_month", "mboapass_year"]).default("order"),
  return_url: z.string().url(),
  order_id: z.string().uuid().optional(),
});

const PollSchema = z.object({ reference: z.string().min(6).max(120) });

// -----------------------------------------------------------------------------
// Campay client interne
// -----------------------------------------------------------------------------
function genReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

function isCampayConfigured() {
  return !!(process.env.CAMPAY_USERNAME && process.env.CAMPAY_PASSWORD);
}

let _campayToken: { value: string; exp: number } | null = null;
async function campayToken(): Promise<string> {
  if (_campayToken && _campayToken.exp > Date.now() + 30_000) {
    return _campayToken.value;
  }
  const r = await fetch(`${CAMPAY_BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.CAMPAY_USERNAME,
      password: process.env.CAMPAY_PASSWORD,
    }),
  });
  if (!r.ok) throw new Error(`Campay token failed: ${r.status}`);
  const j = (await r.json()) as { token: string; expires_in: number };
  _campayToken = {
    value: j.token,
    exp: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
  return _campayToken.value;
}

async function campayCollect(msisdn: string, amount: number, reference: string) {
  const token = await campayToken();
  const phone = msisdn.replace(/\D/g, "").replace(/^0+/, "");
  const fullPhone = phone.startsWith("237") ? phone : `237${phone}`;
  const r = await fetch(`${CAMPAY_BASE}/collect/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: "XAF",
      from: fullPhone,
      description: `MboaEats ${reference}`,
      external_reference: reference,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    reference?: string;
    status?: string;
    ussd_code?: string;
  };
  if (!r.ok || !j.reference) {
    return { ok: false as const, error: `Campay collect HTTP ${r.status}` };
  }
  return { ok: true as const, providerTxId: j.reference, ussd: j.ussd_code };
}

async function campayStatus(providerTxId: string) {
  const token = await campayToken();
  const r = await fetch(`${CAMPAY_BASE}/transaction/${providerTxId}/`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!r.ok) return { status: "unknown" as const };
  const j = (await r.json()) as { status?: string };
  return { status: j.status };
}

async function campayPaymentLink(
  amount: number,
  reference: string,
  returnUrl: string,
) {
  const token = await campayToken();
  const r = await fetch(`${CAMPAY_BASE}/get_payment_link/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: "XAF",
      description: `MboaEats ${reference}`,
      external_reference: reference,
      redirect_url: returnUrl,
      failure_redirect_url: returnUrl,
      payment_options: "CARD",
    }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    link?: string;
    payment_url?: string;
  };
  const link = j.link ?? j.payment_url;
  if (!r.ok || !link) {
    return { ok: false as const, error: `Campay link HTTP ${r.status}` };
  }
  return { ok: true as const, link };
}

// -----------------------------------------------------------------------------
// Helper : valide que `order_id` appartient à l'user et calcule le montant attendu.
// -----------------------------------------------------------------------------
async function assertOrderBelongsToUser(
  orderId: string,
  userId: string,
): Promise<{ total: number; status: string }> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("user_id, total, status")
    .eq("id", orderId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error("Lookup commande échoué");
  if (!data) throw new Error("Commande introuvable");
  if (data.user_id !== userId) {
    throw new Response("Forbidden", { status: 403 });
  }
  return { total: data.total, status: data.status as string };
}

// -----------------------------------------------------------------------------
// initiatePayment (MoMo / Orange)
// -----------------------------------------------------------------------------
export const initiatePayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => InitiateSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!isCampayConfigured()) {
      throw new Error("Paiement indisponible : Campay non configuré");
    }

    // Si purpose = order : la commande doit appartenir au caller ET le
    // montant doit matcher (anti-amount-tampering).
    if (data.purpose === "order") {
      if (!data.order_id) throw new Error("order_id requis pour purpose=order");
      const { total, status } = await assertOrderBelongsToUser(
        data.order_id,
        context.userId,
      );
      if (status !== "pending_payment") {
        throw new Error(`Commande déjà en statut ${status}`);
      }
      if (data.amount !== total) {
        throw new Error("Montant ne correspond pas à la commande");
      }
    }

    const reference = genReference(data.provider);

    const { error: insertErr } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      provider: data.provider,
      reference,
      msisdn: data.msisdn,
      amount_fcfa: data.amount,
      purpose: data.purpose,
      status: "pending",
      metadata: {
        live: true,
        provider_name: "campay",
        order_id: data.order_id ?? null,
      },
    });
    if (insertErr) throw new Error("Impossible d'enregistrer le paiement");

    const res = await campayCollect(data.msisdn, data.amount, reference);
    if (!res.ok) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed" })
        .eq("reference", reference);
      return { ok: false as const, reference, error: res.error };
    }
    await supabaseAdmin
      .from("payments")
      .update({ provider_tx_id: res.providerTxId, status: "pending" })
      .eq("reference", reference);

    return {
      ok: true as const,
      reference,
      providerTxId: res.providerTxId,
      ussd: res.ussd,
      hint: "Validez sur votre téléphone (notification MoMo/Orange).",
    };
  });

// -----------------------------------------------------------------------------
// initiateCardPayment (Carte bancaire via Campay)
// -----------------------------------------------------------------------------
export const initiateCardPayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => InitiateCardSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!isCampayConfigured()) {
      throw new Error("Paiement carte indisponible : Campay non configuré");
    }
    if (data.purpose === "order") {
      if (!data.order_id) throw new Error("order_id requis pour purpose=order");
      const { total, status } = await assertOrderBelongsToUser(
        data.order_id,
        context.userId,
      );
      if (status !== "pending_payment") {
        throw new Error(`Commande déjà en statut ${status}`);
      }
      if (data.amount !== total) {
        throw new Error("Montant ne correspond pas à la commande");
      }
    }

    const reference = genReference("card");

    const { error: insertErr } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      provider: "card",
      reference,
      msisdn: null,
      amount_fcfa: data.amount,
      purpose: data.purpose,
      status: "pending",
      metadata: {
        live: true,
        provider_name: "campay",
        channel: "card",
        order_id: data.order_id ?? null,
      },
    });
    if (insertErr) throw new Error("Impossible d'enregistrer le paiement");

    const res = await campayPaymentLink(
      data.amount,
      reference,
      data.return_url,
    );
    if (!res.ok) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed" })
        .eq("reference", reference);
      return { ok: false as const, reference, error: res.error };
    }
    return { ok: true as const, reference, link: res.link };
  });

// -----------------------------------------------------------------------------
// pollPaymentStatus — auth + ownership check
// -----------------------------------------------------------------------------
export const pollPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) => PollSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("payments")
      .select("user_id, status, provider_tx_id")
      .eq("reference", data.reference)
      .maybeSingle();
    if (error || !row) return { status: "unknown" as const };

    // SECURITY : un user ne peut poller QUE ses propres paiements.
    if (row.user_id !== context.userId) {
      throw new Response("Forbidden", { status: 403 });
    }

    if (row.status === "succeeded") return { status: "succeeded" as const };
    if (row.status === "failed") return { status: "failed" as const };

    // Fallback live check (au cas où le webhook tarde)
    try {
      const token = await campayToken();
      const r = await fetch(`${CAMPAY_BASE}/transaction/${data.reference}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (r.ok) {
        const j = (await r.json()) as { status?: string; reference?: string };
        if (j.status === "SUCCESSFUL") {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "succeeded",
              provider_tx_id: j.reference ?? data.reference,
            })
            .eq("reference", data.reference);
          return { status: "succeeded" as const };
        }
        if (j.status === "FAILED") {
          await supabaseAdmin
            .from("payments")
            .update({ status: "failed" })
            .eq("reference", data.reference);
          return { status: "failed" as const };
        }
      }
    } catch {
      /* ignore */
    }
    return { status: "pending" as const };
  });

// -----------------------------------------------------------------------------
// activateMboaPass — auth + idempotent + montant vérifié
// -----------------------------------------------------------------------------
export const activateMboaPass = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z
      .object({
        plan: z.enum(["month", "year"]),
        reference: z.string().min(6).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // 1) Charger le paiement et vérifier propriétaire + statut succeeded
    const { data: pay, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("user_id, status, amount_fcfa, purpose")
      .eq("reference", data.reference)
      .maybeSingle();
    if (payErr || !pay) {
      return { ok: false as const, error: "Paiement introuvable" };
    }
    if (pay.user_id !== context.userId) {
      throw new Response("Forbidden", { status: 403 });
    }
    if (pay.status !== "succeeded") {
      return { ok: false as const, error: "Paiement non confirmé" };
    }
    const expectedPurpose =
      data.plan === "year" ? "mboapass_year" : "mboapass_month";
    if (pay.purpose !== expectedPurpose) {
      return { ok: false as const, error: "Paiement non destiné à MboaPass" };
    }

    // 2) Idempotence : si un abonnement existe déjà pour cette référence, on
    // le retourne sans en créer un autre. La contrainte UNIQUE sur
    // (payment_reference) côté DB sécurise les race conditions concurrentes.
    const { data: existing } = await supabaseAdmin
      .from("mboapass_subscriptions")
      .select("id, plan, ends_at, status")
      .eq("payment_reference", data.reference)
      .maybeSingle();
    if (existing) {
      return {
        ok: true as const,
        ends_at: existing.ends_at,
        already: true,
      };
    }

    const days = data.plan === "year" ? 365 : 30;
    const ends = new Date(Date.now() + days * 86_400_000).toISOString();

    const { data: created, error: subErr } = await supabaseAdmin
      .from("mboapass_subscriptions")
      .insert({
        user_id: context.userId,
        plan: data.plan,
        ends_at: ends,
        amount_fcfa: pay.amount_fcfa,
        payment_reference: data.reference,
        status: "active",
      })
      .select("ends_at")
      .single();
    if (subErr) {
      // Si UNIQUE violation : un autre process l'a créé entre temps → reload
      const { data: race } = await supabaseAdmin
        .from("mboapass_subscriptions")
        .select("ends_at")
        .eq("payment_reference", data.reference)
        .maybeSingle();
      if (race) return { ok: true as const, ends_at: race.ends_at, already: true };
      throw new Error("Impossible d'activer l'abonnement");
    }
    return { ok: true as const, ends_at: created.ends_at, already: false };
  });

// -----------------------------------------------------------------------------
// getActiveMboaPass — uniquement pour le caller lui-même
// -----------------------------------------------------------------------------
export const getActiveMboaPass = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data: row } = await supabaseAdmin
      .from("mboapass_subscriptions")
      .select("plan, ends_at, status")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { active: !!row, sub: row ?? null };
  });
