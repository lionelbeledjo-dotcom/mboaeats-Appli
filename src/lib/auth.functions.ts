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
  | { ok: false; code: "compte_inexistant" | "email_non_confirme" | "identifiants_invalides" | "erreur"; message: string };

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

    // 1) Vérifier l'existence du compte (afin de différencier "inexistant" de "mauvais mdp")
    const { data: exists, error: existsErr } = await supabaseAdmin.rpc(
      "user_exists_by_email",
      { _email: email }
    );
    if (existsErr) {
      return { ok: false, code: "erreur", message: "Erreur serveur, réessayez." };
    }
    if (!exists) {
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
