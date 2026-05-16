/**
 * MboaEats — Server functions du sous-système auth
 *
 * `getCurrentPrincipal()` est la SEULE manière correcte d'obtenir l'identité
 * et les permissions d'un user côté serveur depuis le frontend. Le hook
 * `useSession()` l'appelle et la met en cache via React Query.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import {
  getTransientSession,
  isSuperadmin2faValid,
} from "./session.server";
import type {
  Principal,
  PlatformRole,
  RestaurantMembership,
} from "./types";

/**
 * Résout le principal courant à partir du JWT Supabase + memberships DB.
 *
 * Retourne `null` si pas de JWT valide. Ne lève PAS — laisse l'appelant
 * gérer le cas non-authentifié (utile en SSR).
 *
 * IMPORTANT : on appelle `supabase.auth.getUser(token)` (et non `getClaims`)
 * pour vérifier que le user n'a pas été banni/supprimé côté Supabase
 * depuis l'émission du token. Corrige l'audit H7.
 */
export const getCurrentPrincipal = createServerFn({ method: "GET" }).handler(
  async (): Promise<Principal | null> => {
    const request = getRequest();
    const authHeader = request?.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    if (!token) return null;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      // Fail-fast en dev, mais ne casse pas SSR si la conf est partielle :
      // on retourne null = non authentifié, et on log côté serveur.
      console.error("[auth] SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY manquant");
      return null;
    }

    // Client lié à CE token : permet de valider la signature + l'état du user.
    const supa = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userRes, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userRes?.user) return null;
    const user = userRes.user;

    // -------------------------------------------------------------------
    // Charge en parallèle : rôles plateforme + memberships actifs
    // On utilise supabaseAdmin parce que `user_roles` et
    // `restaurant_members` ont des RLS qui retourneraient PARTIELLEMENT
    // les infos. Ici on veut la vérité absolue pour ce userId.
    // -------------------------------------------------------------------
    const [rolesRes, membershipsRes] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id),
      supabaseAdmin
        .from("restaurant_members")
        .select("restaurant_id, role, status, joined_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .is("deleted_at", null),
    ]);

    const platformRoles: PlatformRole[] = (rolesRes.data ?? [])
      .map((r) => r.role as string)
      .filter((r): r is PlatformRole =>
        r === "admin" || r === "superadmin" || r === "livreur",
      );

    const memberships: RestaurantMembership[] = (membershipsRes.data ?? []).map(
      (m) => ({
        restaurant_id: m.restaurant_id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
      }),
    );

    // 2FA superadmin : ne vaut que si on a le rôle superadmin ET que le
    // cookie atteste de la validation récente. Le cookie peut ne pas exister
    // (iframe / cookies bloqués) — dans ce cas, false.
    let superadmin2faValid = false;
    try {
      const cookieSession = await getTransientSession();
      superadmin2faValid =
        platformRoles.includes("superadmin") &&
        isSuperadmin2faValid(cookieSession.data, user.id);
    } catch {
      // Pas de cookie / pas de SESSION_SECRET en SSR partiel → on ignore
    }

    return {
      userId: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      platformRoles,
      memberships,
      superadmin2faValid,
    };
  },
);

/**
 * Logout complet :
 *   1. Vide le cookie maison (états transitoires + marqueur 2FA)
 *   2. Le client est responsable d'appeler `supabase.auth.signOut()` côté
 *      browser pour révoquer le refresh token et purger le localStorage.
 *
 * Cette server function NE FAIT QUE le côté serveur. Le hook `useSession`
 * orchestre les deux étapes — voir B.3 `SignOutButton`.
 */
export const clearServerSession = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const session = await getTransientSession();
      await session.clear();
    } catch {
      // Si le cookie était déjà absent, ce n'est pas une erreur.
    }
    return { ok: true as const };
  },
);
