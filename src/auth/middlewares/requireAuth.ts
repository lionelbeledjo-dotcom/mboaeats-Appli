/**
 * MboaEats — Middleware: requireAuth
 *
 * Remplace `requireSupabaseAuth` (audit H7).
 *
 * Différences clé avec l'ancien middleware :
 *   - Utilise `getUser(token)` au lieu de `getClaims(token)` : vérifie aussi
 *     que le user n'est pas banni/supprimé côté Supabase (latence +20ms,
 *     acceptable pour les server functions).
 *   - Expose un contexte `{ supabase, userId, user }` typé correctement.
 *   - Réponses 401 normalisées sans fuite d'info.
 */

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function unauthorized(message: string): never {
  throw new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      // Erreur de configuration serveur, pas de l'auth → 500
      console.error("[auth] SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY manquant");
      throw new Response("Server misconfigured", { status: 500 });
    }

    const request = getRequest();
    const authHeader = request?.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      unauthorized("Authentication required");
    }
    const token = authHeader.slice(7).trim();
    if (!token) unauthorized("Authentication required");

    // Client lié au token — RLS appliquée comme cet utilisateur
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Vérification STRICTE : getUser revalide auprès de Supabase à chaque appel.
    // Plus coûteux que getClaims (qui ne vérifie que la signature), mais c'est
    // le seul moyen de détecter un user banni/supprimé en cours de session.
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      unauthorized("Invalid or expired token");
    }

    const user: User = data.user;

    return next({
      context: {
        supabase,
        userId: user.id,
        user,
      },
    });
  },
);
