import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getMboaSession } from "./session.server";
import { getRequest } from "@tanstack/react-start/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginResult =
  | { ok: true }
  | { ok: false; code: "compte_inexistant" | "email_non_confirme" | "identifiants_invalides" | "compte_verrouille" | "erreur"; message: string };

export const accountExists = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        kind: z.enum(["email", "phone"]),
        identifier: z.string().trim().min(3),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    if (data.kind === "email") {
      const email = data.identifier.toLowerCase();
      const { data: exists, error } = await supabaseAdmin.rpc("user_exists_by_email", { _email: email });
      if (error) return { ok: false as const, exists: false, message: "Erreur serveur." };
      return { ok: true as const, exists: !!exists };
    }
    const phone = data.identifier.replace(/[^\d+]/g, "");
    const { data: exists, error } = await supabaseAdmin.rpc("user_exists_by_phone", { _phone: phone });
    if (error) return { ok: false as const, exists: false, message: "Erreur serveur." };
    return { ok: true as const, exists: !!exists };
  });

export const loginWithPassword = createServerFn({ method: "POST" })
  .inputValidator((data) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResult> => {
    const { email, password } = data;

    // Métadonnées de la requête (IP + UA)
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const req = getRequest();
      ip =
        req?.headers.get("cf-connecting-ip") ??
        req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req?.headers.get("x-real-ip") ??
        null;
      userAgent = req?.headers.get("user-agent") ?? null;
    } catch {}

    const recordAttempt = async (success: boolean) => {
      try {
        await supabaseAdmin.rpc("record_login_attempt", {
          p_email: email, p_success: success, p_ip: ip, p_user_agent: userAgent,
        });
      } catch (e) { console.warn("[login] record_attempt failed", e); }
    };

    // 0) Verrouillage actif ?
    const { data: locked } = await supabaseAdmin.rpc("is_account_locked", { p_email: email });
    if (locked === true) {
      return {
        ok: false,
        code: "compte_verrouille",
        message: "Trop de tentatives échouées. Réessayez dans 5 minutes.",
      };
    }

    // 1) Vérifier l'existence du compte (afin de différencier "inexistant" de "mauvais mdp")
    const { data: exists, error: existsErr } = await supabaseAdmin.rpc(
      "user_exists_by_email",
      { _email: email }
    );
    if (existsErr) {
      return { ok: false, code: "erreur", message: "Erreur serveur, réessayez." };
    }
    if (!exists) {
      await recordAttempt(false);
      return {
        ok: false,
        code: "compte_inexistant",
        message: "Compte inexistant, veuillez vous inscrire.",
      };
    }

    // 2) Tenter la connexion via un client anon temporaire
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (signErr || !signIn?.user) {
      await recordAttempt(false);
      const { data: lockedNow } = await supabaseAdmin.rpc("is_account_locked", { p_email: email });
      if (lockedNow === true) {
        return {
          ok: false,
          code: "compte_verrouille",
          message: "Compte temporairement verrouillé pour sécurité (5 min).",
        };
      }
      const msg = signErr?.message ?? "";
      if (/email not confirmed/i.test(msg)) {
        return {
          ok: false,
          code: "email_non_confirme",
          message: "Email non confirmé. Vérifiez votre boîte mail.",
        };
      }
      return {
        ok: false,
        code: "identifiants_invalides",
        message: "Mot de passe incorrect.",
      };
    }

    await recordAttempt(true);

    // 3) Pose le cookie de session MboaEats
    const session = await getMboaSession();
    await session.update({
      mode: "email",
      identifier: email,
      channel: "email",
      loggedAt: Date.now(),
    });

    return { ok: true };
  });
