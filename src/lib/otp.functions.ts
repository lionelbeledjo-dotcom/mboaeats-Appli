/**
 * MboaEats — OTP par SMS / WhatsApp (refondu)
 *
 * CORRECTIONS DE SÉCURITÉ vs ancien fichier :
 *
 *   C5 [CRITIQUE] verifyOtp : ne fait PLUS `listUsers({ perPage: 100 })` qui
 *     se cassait après 100 users inscrits. Utilise une recherche directe
 *     via la table `phone_users` (nouvelle, peuplée par trigger) OU via
 *     `auth.admin.getUserById` quand on a déjà l'ID.
 *
 *   C6 [CRITIQUE] L'allowlist admin par numéro de téléphone est SUPPRIMÉE
 *     (voir admin-claim.functions.ts). Plus de risque d'élévation par
 *     interception SMS.
 *
 *   Rate limit : conserve les 30s anti-flood, mais on garde la possibilité
 *     d'ajouter `enforceRateLimit` à la couche au-dessus (Lot suivant).
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTransientSession } from "@/auth/session.server";
import { SERVER_CONFIG } from "@/shared/config/server-config";
import { enforceRateLimit } from "@/shared/server/rate-limit";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const { ttlSeconds, maxAttempts, cooldownSeconds } = SERVER_CONFIG.otp;
const SMS_TRIAL_FALLBACK_MESSAGE =
  "Nous n'avons pas pu vous envoyer de SMS. Voulez-vous recevoir votre code par WhatsApp à la place ?";

function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

// -----------------------------------------------------------------------------
// Normalisation E.164 (Cameroun + France principalement)
// -----------------------------------------------------------------------------
export function normalizePhoneNumber(
  phone: string,
  countryCode?: string,
): string {
  if (!phone || typeof phone !== "string") {
    throw new Error("Format de numéro invalide");
  }
  const trimmed = phone.trim().replace(/[\s\-().]/g, "");

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    const normalized = `+${digits}`;
    if (!/^\+\d{8,15}$/.test(normalized)) {
      throw new Error("Format de numéro invalide");
    }
    return normalized;
  }

  let cleaned = trimmed.replace(/\D/g, "");
  const cc = countryCode?.replace(/\D/g, "");

  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
    const n = `+${cleaned}`;
    if (!/^\+\d{8,15}$/.test(n)) throw new Error("Format de numéro invalide");
    return n;
  }

  if ((cc === "33" || cc === "237") && cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
    const n = `+${cc}${cleaned}`;
    if (!/^\+\d{8,15}$/.test(n)) throw new Error("Format de numéro invalide");
    return n;
  }

  if (/^0[67]\d{8}$/.test(cleaned)) return `+33${cleaned.substring(1)}`;
  if (/^6\d{8}$/.test(cleaned)) return `+237${cleaned}`;
  if (/^237\d{8,9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^33\d{9}$/.test(cleaned)) return `+${cleaned}`;

  if (cc) {
    const n = `+${cc}${cleaned}`;
    if (/^\+\d{8,15}$/.test(n)) return n;
  }
  throw new Error("Format de numéro invalide");
}

const normalizePhone = normalizePhoneNumber;

function isTwilioTrialMode() {
  return ["true", "1", "yes", "on"].includes(
    (process.env.TWILIO_IS_TRIAL || "").toLowerCase(),
  );
}

type OtpChannel = "sms" | "whatsapp";

// -----------------------------------------------------------------------------
// Twilio gateway
// -----------------------------------------------------------------------------
async function sendTwilioMessage(opts: {
  to: string;
  body: string;
  channel: OtpChannel;
  contentSid?: string;
  contentVariables?: Record<string, string>;
}) {
  const { to, body, channel, contentSid, contentVariables } = opts;

  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
  const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
  const TWILIO_WHATSAPP_FROM =
    process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_NUMBER;
  const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!LOVABLE_API_KEY) throw new Error("Configuration manquante (LOVABLE_API_KEY).");
  if (!TWILIO_API_KEY) throw new Error("Configuration manquante (TWILIO_API_KEY).");
  if (!TWILIO_FROM_NUMBER)
    throw new Error("Configuration manquante (TWILIO_FROM_NUMBER).");

  if (
    channel === "whatsapp" &&
    !process.env.TWILIO_WHATSAPP_FROM &&
    !TWILIO_MESSAGING_SERVICE_SID
  ) {
    throw new Error(
      "WhatsApp n'est pas encore activé sur ce compte. Utilisez l'email ou contactez le support.",
    );
  }

  const fromRaw =
    channel === "whatsapp"
      ? process.env.TWILIO_WHATSAPP_FROM || TWILIO_FROM_NUMBER!
      : TWILIO_FROM_NUMBER!;
  const From =
    channel === "whatsapp"
      ? fromRaw.startsWith("whatsapp:")
        ? fromRaw
        : `whatsapp:${fromRaw}`
      : fromRaw;
  const To = channel === "whatsapp" ? `whatsapp:${to}` : to;

  const params = new URLSearchParams({ To });
  if (channel === "whatsapp" && TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set("From", From);
  }

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
  } catch (err: unknown) {
    console.error("[OTP] Network error", err);
    throw new Error("Service d'envoi indisponible. Réessayez ou utilisez WhatsApp.");
  }

  const data: Record<string, unknown> = await res.json().catch(() => ({}));
  const errorCode = (data.error_code as number | undefined) ?? null;

  if (!res.ok || errorCode) {
    const code = errorCode ?? res.status;
    const msg = (data.error_message as string) || "envoi impossible";

    if (
      code === 21608 ||
      (res.status === 400 && /trial accounts cannot send messages to unverified numbers/i.test(msg))
    ) {
      throw new Error(SMS_TRIAL_FALLBACK_MESSAGE);
    }
    if (code === 21211 || code === 21614) {
      throw new Error("Numéro invalide ou non compatible SMS. Réessayez ou utilisez WhatsApp.");
    }
    if (channel === "whatsapp" && (code === 63007 || code === 63016)) {
      throw new Error(
        "WhatsApp : ce numéro n'a pas encore activé la conversation avec notre bot.",
      );
    }
    throw new Error(
      channel === "sms"
        ? SMS_TRIAL_FALLBACK_MESSAGE
        : `Impossible d'envoyer le code par WhatsApp (code ${code}). Réessayez.`,
    );
  }
}

// -----------------------------------------------------------------------------
// requestOtp
// -----------------------------------------------------------------------------
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        phone: z.string().min(5).max(30),
        countryCode: z.string().max(5).optional(),
        channel: z.enum(["sms", "whatsapp"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone, data.countryCode);
    // RATE LIMIT ANTI-ABUS SMS : 5 OTP par heure par numéro de téléphone.
    // Twilio facture chaque SMS — un attaquant qui scriperait cette
    // fonction pourrait coûter cher à la plateforme. Le cooldown 30s
    // existant ci-dessous est trop laxiste (140 SMS/h max possible).
    // On combine les deux : 30s minimum entre 2 OTP + 5 max par heure.
    await enforceRateLimit(
      "otp_request_phone",
      getRequest(),
      { limit: 5, windowSeconds: 3600 },
      phone,
    );
    // RATE LIMIT IP : 30 OTP par heure par IP — limite l'abus depuis une
    // seule machine qui tournerait sur plusieurs numéros volés.
    await enforceRateLimit("otp_request_ip", getRequest(), {
      limit: 30,
      windowSeconds: 3600,
    });

    const channel: OtpChannel = isTwilioTrialMode()
      ? "whatsapp"
      : (data.channel ?? "sms");

    const isDev = process.env.NODE_ENV !== "production";

    // Rate limit per-phone (30s minimum)
    if (!isDev) {
      const since = new Date(Date.now() - cooldownSeconds * 1000).toISOString();
      const { data: recent } = await supabaseAdmin
        .from("otp_codes")
        .select("id")
        .eq("phone", phone)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) {
        return {
          ok: false as const,
          error: "Veuillez patienter avant de demander un nouveau code.",
          retryAfter: cooldownSeconds,
        };
      }
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashCode(phone, code);
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("otp_codes")
      .insert({ phone, code_hash, expires_at, method: channel });
    if (error) throw new Error("Impossible d'enregistrer le code");

    const session = await getTransientSession();
    await session.update({
      pendingPhone: phone,
      pendingPhoneAt: Date.now(),
    });

    const smsBody =
      `MboaEats — Code de connexion : ${code}\n` +
      `Valable 5 min. Ne le partagez avec personne.\n` +
      `Si ce n'est pas vous, ignorez ce message.`;
    const waBody =
      `*MboaEats*\n` +
      `Votre code de vérification est *${code}*.\n` +
      `Ce code expire dans 5 minutes. Ne le partagez avec personne.`;

    const TWILIO_WHATSAPP_OTP_CONTENT_SID =
      process.env.TWILIO_WHATSAPP_OTP_CONTENT_SID;

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
      console.log(`[DEV OTP] phone=${phone} code=${code} channel=${channel}`);
    }

    return {
      ok: true as const,
      expiresIn: ttlSeconds,
      channel,
      ...(isDev ? { devCode: code } : {}),
    };
  });

// -----------------------------------------------------------------------------
// getOtpDeliveryConfig
// -----------------------------------------------------------------------------
export const getOtpDeliveryConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const whatsappAvailable = Boolean(
      process.env.TWILIO_WHATSAPP_FROM ||
        process.env.TWILIO_MESSAGING_SERVICE_SID,
    );
    const trial = isTwilioTrialMode();
    return {
      twilioTrial: trial,
      whatsappAvailable,
      emailAvailable: true,
      defaultChannel: whatsappAvailable && trial ? "whatsapp" : "email",
    };
  },
);

// -----------------------------------------------------------------------------
// verifyOtp — REFONTE recherche utilisateur (audit C5)
// -----------------------------------------------------------------------------
//
// Stratégie : on n'utilise PLUS `listUsers({ perPage: 100 })` qui se cassait
// après 100 utilisateurs. À la place, on cherche dans la table `phone_users`
// (créée par migration `007_phone_users.sql`) qui est peuplée par trigger
// à chaque insert/update sur auth.users.
//
// Si phone_users n'a pas l'entrée (cas legacy avant migration), on RECRÉE
// l'utilisateur via createUser idempotent (l'erreur "déjà existant" est
// rattrapée et on ré-essaie un select par email-synthétique unique).
// -----------------------------------------------------------------------------
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        phone: z.string(),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    // RATE LIMIT BRUTE-FORCE : 20 essais de vérification par IP toutes les
    // 15 min. Le code OTP étant à 6 chiffres (1 chance sur 1M), on veut
    // empêcher un attaquant de tester 1000 combinaisons.
    await enforceRateLimit("otp_verify_ip", getRequest(), {
      limit: 20,
      windowSeconds: 900,
    });
    // RATE LIMIT PHONE : 10 essais par numéro toutes les 15 min — empêche
    // un attaquant qui aurait l'IP changeante de cibler un numéro précis.
    await enforceRateLimit(
      "otp_verify_phone",
      getRequest(),
      { limit: 10, windowSeconds: 900 },
      phone,
    );

    const session = await getTransientSession();
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
    if (row.attempts >= maxAttempts) {
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

    // -------------------------------------------------------------------
    // Cherche / crée le user via la table phone_users (corrige C5)
    // -------------------------------------------------------------------
    const sanitized = phone.replace(/[^\d]/g, "");
    const syntheticEmail = `phone-${sanitized}@phone.mboaeats.local`;

    // 1) Tentative lookup direct dans phone_users
    const { data: phoneUserRow } = await supabaseAdmin
      .from("phone_users")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    let userId: string | null = phoneUserRow?.user_id ?? null;

    // 2) Si pas trouvé : tenter createUser (idempotent — duplicate caught)
    if (!userId) {
      const createRes = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone, login_method: "otp_sms" },
      });
      if (createRes.data?.user) {
        userId = createRes.data.user.id;
      } else if (createRes.error) {
        // Already exists ? Récupérer via getUserByEmail (API admin 2.x).
        // Si non disponible, on fait un SELECT direct dans `auth.users`
        // via supabaseAdmin (qui a service_role).
        const { data: authUser } = await supabaseAdmin
          .from("phone_users")
          .select("user_id")
          .eq("phone", phone)
          .maybeSingle();
        if (authUser?.user_id) {
          userId = authUser.user_id;
        } else {
          // Dernier recours : query auth.users directement (service_role only)
          const { data: rawUser } = await supabaseAdmin
            .rpc("admin_find_user_id_by_email", { _email: syntheticEmail });
          if (rawUser) userId = rawUser as unknown as string;
        }
      }
    }

    if (!userId) {
      console.error("[verifyOtp] Impossible de résoudre user pour phone", phone);
      throw new Error("Impossible d'ouvrir la session. Réessayez.");
    }

    // 3) Générer un magic link pour ouvrir la session côté client
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: syntheticEmail,
      });
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("generateLink error", linkError);
      throw new Error("Impossible d'ouvrir la session. Réessayez.");
    }

    // 4) Met à jour les états transitoires (le cookie ne porte plus l'identité)
    await session.update({
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

// Compat ascendante : ancien nom `sendOtp` → désormais `requestOtp`.
export const sendOtp = requestOtp;
