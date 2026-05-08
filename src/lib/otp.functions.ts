import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getMboaSession } from "./session.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const OTP_TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;
const SMS_TRIAL_FALLBACK_MESSAGE =
  "Nous n'avons pas pu vous envoyer de SMS. Voulez-vous recevoir votre code par WhatsApp à la place ?";

function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

/**
 * Normalise un numéro vers le format E.164 (+<indicatif><numéro>).
 * - Supprime espaces, tirets, parenthèses, points
 * - "00xx..." -> "+xx..."
 * - "06/07XXXXXXXX" (10 chiffres) -> "+33XXXXXXXXX" (mobile France)
 * - "6XXXXXXXX" (9 chiffres commençant par 6) -> "+237XXXXXXXX" (mobile Cameroun)
 * - Rejette tout numéro qui ne devient pas un E.164 valide.
 */
export function normalizePhoneNumber(phone: string, countryCode?: string): string {
  if (!phone || typeof phone !== "string") {
    throw new Error("Format de numéro invalide");
  }
  const trimmed = phone.trim().replace(/[\s\-().]/g, "");

  // Si déjà au format international "+..."
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    const normalized = `+${digits}`;
    if (!/^\+\d{8,15}$/.test(normalized)) {
      throw new Error("Format de numéro invalide");
    }
    return normalized;
  }

  let cleaned = trimmed.replace(/\D/g, "");
  const normalizedCountry = countryCode?.replace(/\D/g, "");

  // 00xx... -> +xx...
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
    const normalized = `+${cleaned}`;
    if (!/^\+\d{8,15}$/.test(normalized)) {
      throw new Error("Format de numéro invalide");
    }
    return normalized;
  }

  if ((normalizedCountry === "33" || normalizedCountry === "237") && cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
    const normalized = `+${normalizedCountry}${cleaned}`;
    if (!/^\+\d{8,15}$/.test(normalized)) {
      throw new Error("Format de numéro invalide");
    }
    return normalized;
  }

  // France mobile : 06/07 + 8 chiffres = 10 chiffres
  if (/^0[67]\d{8}$/.test(cleaned)) {
    return `+33${cleaned.substring(1)}`;
  }

  // Cameroun mobile : 6XXXXXXXX (9 chiffres commençant par 6)
  if (/^6\d{8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }

  // Cameroun déjà préfixé sans '+' : 237XXXXXXXXX
  if (/^237\d{8,9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // France déjà préfixée sans '+' : 33XXXXXXXXX
  if (/^33\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (normalizedCountry) {
    const normalized = `+${normalizedCountry}${cleaned}`;
    if (/^\+\d{8,15}$/.test(normalized)) return normalized;
  }

  throw new Error("Format de numéro invalide");
}

const normalizePhone = normalizePhoneNumber;

function isTwilioTrialMode() {
  return ["true", "1", "yes", "on"].includes((process.env.TWILIO_IS_TRIAL || "").toLowerCase());
}

type OtpChannel = "sms" | "whatsapp";

/**
 * Envoie un message via Twilio (SMS ou WhatsApp) à travers le Lovable Gateway.
 * Loggue intégralement le résultat Twilio et lève une erreur claire en cas d'échec.
 */
async function sendTwilioMessage(opts: {
  to: string;
  body: string;
  channel: OtpChannel;
  /** SID d'un Content Template Twilio (WhatsApp Authentication) — recommandé hors fenêtre 24h. */
  contentSid?: string;
  /** Variables du template (ex: {"1": "123456"}). */
  contentVariables?: Record<string, string>;
}) {
  const { to, body, channel, contentSid, contentVariables } = opts;

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
  const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
  // Optionnel : numéro WhatsApp dédié (sandbox: +14155238886, ou WA Business)
  const TWILIO_WHATSAPP_FROM =
    process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_NUMBER;
  // Optionnel : Messaging Service SID (recommandé pour WhatsApp en production)
  const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!LOVABLE_API_KEY) throw new Error("Configuration manquante (LOVABLE_API_KEY).");
  if (!TWILIO_API_KEY) throw new Error("Configuration manquante (TWILIO_API_KEY).");
  if (!TWILIO_FROM_NUMBER) throw new Error("Configuration manquante (TWILIO_FROM_NUMBER).");

  if (channel === "whatsapp" && !process.env.TWILIO_WHATSAPP_FROM && !TWILIO_MESSAGING_SERVICE_SID) {
    console.error("[OTP] WhatsApp non configuré : TWILIO_WHATSAPP_FROM et TWILIO_MESSAGING_SERVICE_SID absents. Le numéro SMS standard ne peut pas envoyer de WhatsApp.");
    throw new Error(
      "WhatsApp n'est pas encore activé sur ce compte. Utilisez l'email ou contactez le support sur WhatsApp pour vous inscrire manuellement."
    );
  }

  const fromRaw = channel === "whatsapp" ? (process.env.TWILIO_WHATSAPP_FROM || TWILIO_FROM_NUMBER!) : TWILIO_FROM_NUMBER!;
  const From = channel === "whatsapp"
    ? (fromRaw.startsWith("whatsapp:") ? fromRaw : `whatsapp:${fromRaw}`)
    : fromRaw;
  const To = channel === "whatsapp" ? `whatsapp:${to}` : to;

  const params = new URLSearchParams({ To });

  // Préfère un Messaging Service quand disponible (meilleure délivrabilité WA)
  if (channel === "whatsapp" && TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set("From", From);
  }

  // Si un Content Template approuvé est fourni (WhatsApp Authentication template),
  // on l'utilise — c'est la voie conforme aux règles Meta hors fenêtre 24h.
  if (channel === "whatsapp" && contentSid) {
    params.set("ContentSid", contentSid);
    if (contentVariables) {
      params.set("ContentVariables", JSON.stringify(contentVariables));
    }
  } else {
    params.set("Body", body);
  }

  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
  } catch (err: any) {
    console.error("[OTP] Network error contacting Twilio gateway:", err?.message || err);
    throw new Error("Service d'envoi indisponible. Réessayez ou utilisez WhatsApp.");
  }

  const data: any = await res.json().catch(() => ({}));

  // Log complet (status / sid / errorCode / errorMessage)
  console.log("[OTP] Twilio send result:", {
    httpStatus: res.status,
    channel,
    to: data?.to ?? To,
    from: data?.from ?? From,
    sid: data?.sid,
    status: data?.status,
    errorCode: data?.error_code ?? data?.errorCode ?? null,
    errorMessage: data?.error_message ?? data?.errorMessage ?? null,
  });

  if (!res.ok || data?.error_code) {
    const code = data?.error_code ?? res.status;
    const msg = data?.error_message || data?.message || "envoi impossible";

    // Erreurs Twilio fréquentes -> message utilisateur lisible
    // 21608 : numéro non vérifié sur compte Trial
    // 21211 : numéro destinataire invalide
    // 21614 : numéro non SMS-capable
    // 63007/63016 : WhatsApp — destinataire non opt-in / hors fenêtre 24h
    if (code === 21608 || (res.status === 400 && /trial accounts cannot send messages to unverified numbers/i.test(msg))) {
      throw new Error(SMS_TRIAL_FALLBACK_MESSAGE);
    }
    if (code === 21211 || code === 21614) {
      throw new Error("Numéro invalide ou non compatible SMS. Réessayez ou utilisez WhatsApp.");
    }
    if (channel === "whatsapp" && (code === 63007 || code === 63016)) {
      throw new Error(
        "WhatsApp : ce numéro n'a pas encore activé la conversation avec notre bot. Envoyez d'abord 'join' au numéro WhatsApp Twilio, puis réessayez."
      );
    }

    throw new Error(
      channel === "sms"
        ? SMS_TRIAL_FALLBACK_MESSAGE
        : `Impossible d'envoyer le code par WhatsApp (code ${code}). Réessayez.`
    );
  }

  return data;
}

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      phone: z.string(),
      channel: z.enum(["sms", "whatsapp"]).optional().default("sms"),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const channel: OtpChannel = isTwilioTrialMode() ? "whatsapp" : (data.channel ?? "sms");

    // Mode développement : on saute le rate limit et on laisse la possibilité
    // de renvoyer le code en clair pour permettre le test sans SMS réel.
    const isDev = process.env.NODE_ENV !== "production";

    // Rate limit: max 1 code in last 30s (désactivé en dev)
    if (!isDev) {
      const since = new Date(Date.now() - 30_000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("otp_codes")
        .select("id")
        .eq("phone", phone)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) {
        // On retourne plutôt qu'on lance, pour que le client puisse afficher
        // un message poli et que l'overlay runtime-error ne se déclenche pas.
        return {
          ok: false as const,
          error: "Veuillez patienter avant de demander un nouveau code.",
          retryAfter: 30,
        };
      }
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashCode(phone, code);
    const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("otp_codes")
      .insert({ phone, code_hash, expires_at, method: channel });
    if (error) throw new Error("Impossible d'enregistrer le code");

    const session = await getMboaSession();
    await session.update({
      pendingPhone: phone,
      pendingPhoneAt: Date.now(),
    });

    // ─── Messages brandés MboaEats ─────────────────────────────────────────
    // SMS : court (1 segment GSM-7), brandé, mention sécurité.
    const smsBody =
      `MboaEats — Code de connexion : ${code}\n` +
      `Valable 5 min. Ne le partagez avec personne.\n` +
      `Si ce n'est pas vous, ignorez ce message.`;

    // WhatsApp : conforme aux règles Meta pour OTP (catégorie Authentication).
    // Pas de promo, pas de lien, pas d'emoji, mention "ne partagez pas".
    const waBody =
      `*MboaEats*\n` +
      `Votre code de vérification est *${code}*.\n` +
      `Ce code expire dans 5 minutes. Ne le partagez avec personne, même avec un membre de l'équipe MboaEats.`;

    // Si un Content Template Twilio approuvé existe (WhatsApp Authentication),
    // on l'utilise. Sinon, fallback sur un message texte brandé.
    const TWILIO_WHATSAPP_OTP_CONTENT_SID = process.env.TWILIO_WHATSAPP_OTP_CONTENT_SID;

    // En dev, on évite l'appel Twilio (qui peut échouer faute de credentials)
    // et on renvoie le code directement pour que le testeur puisse continuer.
    if (!isDev) {
      if (channel === "whatsapp") {
        await sendTwilioMessage({
          to: phone,
          body: waBody,
          channel,
          contentSid: TWILIO_WHATSAPP_OTP_CONTENT_SID || undefined,
          contentVariables: TWILIO_WHATSAPP_OTP_CONTENT_SID ? { "1": code } : undefined,
        });
      } else {
        await sendTwilioMessage({ to: phone, body: smsBody, channel });
      }
    } else {
      // Trace serveur pour faciliter le debug.
      console.log(`[DEV OTP] phone=${phone} code=${code} channel=${channel}`);
    }

    return {
      ok: true as const,
      expiresIn: OTP_TTL_SECONDS,
      channel,
      // Le code en clair n'est exposé QUE en développement.
      ...(isDev ? { devCode: code } : {}),
    };
  });

export const getOtpDeliveryConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    const whatsappAvailable = Boolean(
      process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID
    );
    const trial = isTwilioTrialMode();
    return {
      twilioTrial: trial,
      whatsappAvailable,
      emailAvailable: true,
      defaultChannel: whatsappAvailable && trial ? "whatsapp" : "email",
    };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string(), code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);

    // Vérification "soft" du numéro lié à la session (cookies parfois indisponibles
    // en iframe preview / Safari ITP). La sécurité repose sur code_hash + TTL + tentatives.
    const session = await getMboaSession();
    const pending = session.data.pendingPhone;
    if (pending && pending !== phone) {
      throw new Error("Ce code ne correspond pas au numéro utilisé pour la demande.");
    }

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

    // ─── Crée / retrouve un utilisateur Supabase Auth lié à ce téléphone ─────
    // On utilise un email synthétique stable pour pouvoir générer un magic link
    // et ouvrir une vraie session côté client (les RLS s'appuient sur auth.uid()).
    const sanitized = phone.replace(/[^\d]/g, "");
    const syntheticEmail = `phone-${sanitized}@phone.mboaeats.local`;

    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    if (listError) {
      console.error("listUsers error", listError);
    }
    const existingUser = existingUsers?.users.find(
      (user) => user.email?.toLowerCase() === syntheticEmail.toLowerCase()
    );

    // 1) Créer l'utilisateur s'il n'existe pas (idempotent — ignore l'erreur "déjà existant")
    if (!existingUser) {
      await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone, login_method: "otp_sms" },
      }).catch((error) => {
        console.error("create phone user error", error);
      });
    } else if (existingUser.user_metadata?.phone !== phone || existingUser.phone !== phone.replace(/^\+/, "")) {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        phone,
        phone_confirm: true,
        user_metadata: { ...existingUser.user_metadata, phone, login_method: "otp_sms" },
      }).catch((error) => {
        console.error("update phone user error", error);
      });
    }

    // 2) Générer un magic link admin pour récupérer un hashed_token utilisable côté client
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("generateLink error", linkError);
      throw new Error("Impossible d'ouvrir la session. Réessayez.");
    }

    // Met à jour la session cookie côté serveur
    await session.update({
      mode: "phone",
      identifier: phone,
      phone,
      channel: "sms",
      loggedAt: Date.now(),
      pendingPhone: undefined,
      pendingPhoneAt: undefined,
    });

    return {
      ok: true,
      phone,
      auth: {
        email: syntheticEmail,
        token_hash: linkData.properties.hashed_token,
      },
    };
  });
