import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ───────────────────────────────────────────────────────────────────────────
// MboaEats — Paiements MTN MoMo & Orange Money via Campay (agrégateur CM)
// Mode LIVE uniquement. CAMPAY_USERNAME + CAMPAY_PASSWORD sont requis.
// Webhook: /api/public/campay-webhook (signé via CAMPAY_WEBHOOK_KEY)
// ───────────────────────────────────────────────────────────────────────────

const CAMPAY_BASE = process.env.CAMPAY_BASE_URL || "https://campay.net/api";

const InitiateSchema = z.object({
  provider: z.enum(["momo", "orange"]),
  msisdn: z.string().min(8).max(15),
  amount: z.number().int().positive().max(10_000_000),
  purpose: z.string().min(1).max(40).default("order"),
  metadata: z.record(z.string(), z.any()).optional(),
});

const InitiateCardSchema = z.object({
  amount: z.number().int().positive().max(10_000_000),
  purpose: z.string().min(1).max(40).default("order"),
  return_url: z.string().url(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const PollSchema = z.object({ reference: z.string().min(6).max(120) });

const VerifySchema = z.object({
  reference: z.string().min(6).max(120),
  otp: z.string().regex(/^\d{4,8}$/).optional(),
});

function genReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function isCampayConfigured() {
  return !!(process.env.CAMPAY_USERNAME && process.env.CAMPAY_PASSWORD);
}

// Cache simple du token (in-memory worker)
let _token: { value: string; exp: number } | null = null;
async function campayToken(): Promise<string> {
  if (_token && _token.exp > Date.now() + 30_000) return _token.value;
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
  _token = { value: j.token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return _token.value;
}

async function campayCollect(msisdn: string, amount: number, reference: string) {
  const token = await campayToken();
  // Normaliser numéro CM : 237XXXXXXXXX (sans +)
  const phone = msisdn.replace(/\D/g, "").replace(/^0+/, "");
  const fullPhone = phone.startsWith("237") ? phone : `237${phone}`;
  const r = await fetch(`${CAMPAY_BASE}/collect/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
    body: JSON.stringify({
      amount: String(amount),
      currency: "XAF",
      from: fullPhone,
      description: `MboaEats ${reference}`,
      external_reference: reference,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { reference?: string; status?: string; ussd_code?: string };
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
  const j = (await r.json()) as { status: string };
  return { status: j.status }; // SUCCESSFUL | FAILED | PENDING
}

export const initiatePayment = createServerFn({ method: "POST" })
  .inputValidator((d) => InitiateSchema.parse(d))
  .handler(async ({ data }) => {
    if (!isCampayConfigured()) {
      throw new Error("Paiement indisponible : Campay n'est pas configuré.");
    }
    const reference = genReference(data.provider);

    const { error } = await supabaseAdmin.from("payments").insert({
      provider: data.provider,
      reference,
      msisdn: data.msisdn,
      amount_fcfa: data.amount,
      purpose: data.purpose,
      status: "otp_required",
      otp_code: null,
      metadata: { live: true, provider_name: "campay", ...(data.metadata ?? {}) },
    });
    if (error) throw new Error(error.message);

    const res = await campayCollect(data.msisdn, data.amount, reference);
    if (!res.ok) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("reference", reference);
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

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => VerifySchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("reference", data.reference)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false, error: "Référence introuvable" };
    if (row.status === "succeeded") return { ok: true, alreadyPaid: true };

    // Polling Campay (live uniquement)
    if (!row.provider_tx_id) return { ok: false, error: "Transaction non initiée" };
    const s = await campayStatus(row.provider_tx_id);
    if (s.status === "FAILED") {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("reference", data.reference);
      return { ok: false, error: "Paiement refusé par l'opérateur" };
    }
    if (s.status !== "SUCCESSFUL") {
      return { ok: false, pending: true, error: "En attente de validation sur le téléphone…" };
    }

    const { error: upErr } = await supabaseAdmin
      .from("payments")
      .update({ status: "succeeded", provider_tx_id: row.provider_tx_id ?? row.reference })
      .eq("reference", data.reference);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, alreadyPaid: false };
  });

// ─── MboaPass : activation après paiement réussi ────────────────────────────
const ActivateSubSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["month", "year"]),
  reference: z.string().min(6),
});

export const activateMboaPass = createServerFn({ method: "POST" })
  .inputValidator((d) => ActivateSubSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: pay } = await supabaseAdmin
      .from("payments").select("status, amount_fcfa")
      .eq("reference", data.reference).maybeSingle();
    if (!pay || pay.status !== "succeeded") {
      return { ok: false, error: "Paiement non confirmé" };
    }
    const days = data.plan === "year" ? 365 : 30;
    const ends = new Date(Date.now() + days * 86_400_000).toISOString();
    const { error } = await supabaseAdmin.from("mboapass_subscriptions").insert({
      user_id: data.userId,
      plan: data.plan,
      ends_at: ends,
      amount_fcfa: pay.amount_fcfa,
    });
    if (error) throw new Error(error.message);
    return { ok: true, ends_at: ends };
  });

export const getActiveMboaPass = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("mboapass_subscriptions")
      .select("plan, ends_at, status")
      .eq("user_id", data.userId)
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { active: !!row, sub: row ?? null };
  });

// ─── Carte bancaire via Campay (hosted payment link Visa/Mastercard) ────────
async function campayPaymentLink(amount: number, reference: string, returnUrl: string) {
  const token = await campayToken();
  const r = await fetch(`${CAMPAY_BASE}/get_payment_link/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
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
  const j = (await r.json().catch(() => ({}))) as { link?: string; payment_url?: string };
  const link = j.link ?? j.payment_url;
  if (!r.ok || !link) return { ok: false as const, error: `Campay link HTTP ${r.status}` };
  return { ok: true as const, link };
}

export const initiateCardPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => InitiateCardSchema.parse(d))
  .handler(async ({ data }) => {
    if (!isCampayConfigured()) {
      throw new Error("Paiement carte indisponible : Campay n'est pas configuré.");
    }
    const reference = genReference("card");
    const { error } = await supabaseAdmin.from("payments").insert({
      provider: "card",
      reference,
      msisdn: null,
      amount_fcfa: data.amount,
      purpose: data.purpose,
      status: "pending",
      otp_code: null,
      metadata: { live: true, provider_name: "campay", channel: "card", ...(data.metadata ?? {}) },
    });
    if (error) throw new Error(error.message);

    const res = await campayPaymentLink(data.amount, reference, data.return_url);
    if (!res.ok) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("reference", reference);
      return { ok: false as const, reference, error: res.error };
    }
    return { ok: true as const, reference, link: res.link };
  });

export const pollPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => PollSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("payments")
      .select("status, provider_tx_id")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!row) return { status: "unknown" as const };
    if (row.status === "succeeded") return { status: "succeeded" as const };
    if (row.status === "failed") return { status: "failed" as const };
    // Si webhook pas encore reçu, on tente une vérif live via external_reference
    try {
      const token = await campayToken();
      const r = await fetch(`${CAMPAY_BASE}/transaction/${data.reference}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (r.ok) {
        const j = (await r.json()) as { status?: string; reference?: string };
        if (j.status === "SUCCESSFUL") {
          await supabaseAdmin.from("payments")
            .update({ status: "succeeded", provider_tx_id: j.reference ?? data.reference })
            .eq("reference", data.reference);
          return { status: "succeeded" as const };
        }
        if (j.status === "FAILED") {
          await supabaseAdmin.from("payments").update({ status: "failed" }).eq("reference", data.reference);
          return { status: "failed" as const };
        }
      }
    } catch { /* ignore */ }
    return { status: "pending" as const };
  });
