import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getMboaSession } from "./session.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const OTP_TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim().replace(/\s+/g, "");
  if (!trimmed.startsWith("+")) throw new Error("Numéro invalide (format E.164 requis, ex: +237...)");
  if (!/^\+\d{6,15}$/.test(trimmed)) throw new Error("Numéro invalide");
  return trimmed;
}

async function sendSms(to: string, body: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
  const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");
  if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY manquant");
  if (!TWILIO_FROM_NUMBER) throw new Error("TWILIO_FROM_NUMBER manquant");

  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Twilio error", res.status, data);
    throw new Error(`Échec d'envoi du SMS (${res.status})`);
  }
  return data;
}

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);

    // Rate limit: max 1 code in last 30s
    const since = new Date(Date.now() - 30_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("otp_codes")
      .select("id")
      .eq("phone", phone)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      throw new Error("Veuillez patienter avant de demander un nouveau code.");
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashCode(phone, code);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("otp_codes")
      .insert({ phone, code_hash, expires_at });
    if (error) throw new Error("Impossible d'enregistrer le code");

    // Verrouille la session sur ce numéro : seul ce numéro pourra valider l'OTP
    const session = await getMboaSession();
    await session.update({
      pendingPhone: phone,
      pendingPhoneAt: Date.now(),
    });

    await sendSms(phone, `MboaEats : votre code de vérification est ${code}. Valable 5 min. Ne le partagez avec personne.`);

    return { ok: true, expiresIn: OTP_TTL_SECONDS };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const code_hash = hashCode(phone, data.code);

    const { data: rows } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) throw new Error("Aucun code en attente. Demandez un nouveau code.");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Code expiré. Demandez un nouveau code.");
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new Error("Trop de tentatives. Demandez un nouveau code.");
    }

    if (row.code_hash !== code_hash) {
      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Code incorrect.");
    }

    await supabaseAdmin
      .from("otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const session = await getMboaSession();
    await session.update({
      mode: "phone",
      identifier: phone,
      phone,
      channel: "sms",
      loggedAt: Date.now(),
    });

    return { ok: true, phone };
  });
