import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ───────────────────────────────────────────────────────────────────────────
// MboaEats — Paiements MTN MoMo & Orange Money
//
// Switch automatique démo ↔ prod selon présence des secrets :
//  • MOMO_SUBSCRIPTION_KEY + MOMO_API_USER + MOMO_API_KEY  → vraie API MTN
//  • ORANGE_CLIENT_ID + ORANGE_CLIENT_SECRET               → vraie API Orange
// Sinon → mode démo (OTP attendu = 123456).
// ───────────────────────────────────────────────────────────────────────────

const InitiateSchema = z.object({
  provider: z.enum(["momo", "orange"]),
  msisdn: z.string().min(8).max(15),
  amount: z.number().int().positive().max(10_000_000),
  purpose: z.string().min(1).max(40).default("order"),
  metadata: z.record(z.string(), z.any()).optional(),
});

const VerifySchema = z.object({
  reference: z.string().min(6).max(80),
  otp: z.string().regex(/^\d{4,8}$/),
});

function genReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function isMomoConfigured() {
  return !!(process.env.MOMO_SUBSCRIPTION_KEY && process.env.MOMO_API_USER && process.env.MOMO_API_KEY);
}
function isOrangeConfigured() {
  return !!(process.env.ORANGE_CLIENT_ID && process.env.ORANGE_CLIENT_SECRET);
}

// Stub : à remplacer par l'appel réel au sandbox MTN une fois les clés fournies.
// Doc: https://momodeveloper.mtn.com/api-documentation/api-description/
async function callMomoCollection(_msisdn: string, _amount: number, reference: string) {
  // TODO prod: POST /collection/v1_0/requesttopay avec X-Reference-Id = reference
  return { ok: true, providerTxId: reference };
}

// Stub Orange Money — Web Payment / OM API CM
async function callOrangePush(_msisdn: string, _amount: number, reference: string) {
  // TODO prod: POST /omcoreapis/1.0.2/mp/init puis /pay
  return { ok: true, providerTxId: reference };
}

export const initiatePayment = createServerFn({ method: "POST" })
  .inputValidator((d) => InitiateSchema.parse(d))
  .handler(async ({ data }) => {
    const reference = genReference(data.provider);
    const live = data.provider === "momo" ? isMomoConfigured() : isOrangeConfigured();

    // Démo : OTP fixe 123456
    const otpCode = live ? null : "123456";

    const { error } = await supabaseAdmin.from("payments").insert({
      provider: data.provider,
      reference,
      msisdn: data.msisdn,
      amount_fcfa: data.amount,
      purpose: data.purpose,
      status: "otp_required",
      otp_code: otpCode,
      metadata: { live, ...(data.metadata ?? {}) },
    });
    if (error) throw new Error(error.message);

    if (live) {
      const res = data.provider === "momo"
        ? await callMomoCollection(data.msisdn, data.amount, reference)
        : await callOrangePush(data.msisdn, data.amount, reference);
      if (!res.ok) {
        await supabaseAdmin.from("payments").update({ status: "failed" }).eq("reference", reference);
        return { ok: false, reference, mode: "live" as const, error: "Provider rejected" };
      }
    }

    return {
      ok: true,
      reference,
      mode: live ? ("live" as const) : ("demo" as const),
      // En démo on renvoie l'OTP pour faciliter le test
      hint: live ? null : "Code de démo : 123456",
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

    const live = !!(row.metadata as { live?: boolean } | null)?.live;

    if (!live) {
      if (data.otp !== row.otp_code) {
        return { ok: false, error: "Code OTP invalide" };
      }
    } else {
      // TODO prod : vérifier le statut auprès de MTN/Orange.
      // Pour l'instant on accepte toute chaîne 4-8 chiffres en attendant les clés.
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
