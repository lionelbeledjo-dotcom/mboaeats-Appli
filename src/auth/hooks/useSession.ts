/**
 * MboaEats — useSession : hook React unique, source de vérité côté client.
 *
 * Remplace simultanément :
 *   - `useAuth`         (cf src/hooks/useAuth.ts)        — session brute Supabase
 *   - `useSessionUser`  (cf src/hooks/useSessionUser.ts) — cookie maison
 *   - `useUserRoles`    (cf src/hooks/useUserRoles.ts)   — rôles
 *
 * Pourquoi un seul hook ?
 *   - Le `Principal` (rôles + memberships) doit se charger UNE fois et
 *     être lu partout. React Query gère le cache + l'invalidation.
 *   - L'écoute des changements Supabase (`onAuthStateChange`) doit aussi
 *     être centralisée : sinon chaque composant qui appelle `useAuth`
 *     ouvre son propre listener et on multiplie les fetches inutiles.
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentPrincipal,
  clearServerSession,
} from "@/auth/session.functions";
import type {
  ClientSession,
  Principal,
  RestaurantRole,
} from "@/auth/types";
import {
  hasMembership,
  isPlatformAdmin,
  isPlatformSuperadmin,
  isDriver,
} from "@/auth/types";

const SESSION_QUERY_KEY = ["mboa", "session", "principal"] as const;

/**
 * Hook principal : retourne l'état de session courant + helpers de permission.
 *
 * Le query React Query est invalidé automatiquement sur :
 *   - SIGNED_IN, SIGNED_OUT, USER_UPDATED, TOKEN_REFRESHED via le listener
 *     Supabase enregistré une seule fois au mount du provider.
 *
 * Si tu veux forcer le refresh (après promotion admin par exemple), appelle
 * `refresh()` retourné par le hook.
 */
export function useSession() {
  const fetchPrincipal = useServerFn(getCurrentPrincipal);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => fetchPrincipal(),
    staleTime: 30_000, // 30s — pas la peine de refaire le RPC plus souvent
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Compute le ClientSession dérivé du résultat React Query
  let session: ClientSession;
  if (query.isLoading) {
    session = { status: "loading" };
  } else if (query.data) {
    session = { status: "authenticated", principal: query.data };
  } else {
    session = { status: "unauthenticated" };
  }

  const principal: Principal | null =
    session.status === "authenticated" ? session.principal : null;

  return {
    session,
    principal,
    isLoading: query.isLoading,
    isAuthenticated: session.status === "authenticated",
    // Helpers de permission (mémoïsation inutile : ce sont des reads sur Principal)
    isPlatformAdmin: principal ? isPlatformAdmin(principal) : false,
    isPlatformSuperadmin: principal ? isPlatformSuperadmin(principal) : false,
    isDriver: principal ? isDriver(principal) : false,
    hasMembership: (restaurantId: string, minRole: RestaurantRole = "kitchen") =>
      principal ? hasMembership(principal, restaurantId, minRole) : false,
    refresh: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  };
}

/**
 * Hook utilitaire à monter UNE SEULE FOIS dans `<AuthProvider>` :
 *   - Écoute les events Supabase et invalide la query session.
 *   - Évite que chaque consumer `useSession` n'enregistre son propre listener.
 */
export function useSyncSupabaseAuthEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Sur tout changement d'état Supabase (connexion, déco, refresh token,
      // update user), on invalide la query → useSession re-fetch.
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);
}

/**
 * Logout côté navigateur :
 *   1. Vide le cookie serveur (états transitoires + marqueur 2FA)
 *   2. supabase.auth.signOut() → révocation refresh token + clear localStorage
 *   3. Invalide la query session
 *   4. Redirige (à faire par l'appelant)
 */
export function useSignOut() {
  const clearServer = useServerFn(clearServerSession);
  const queryClient = useQueryClient();
  return async () => {
    // On exécute les deux en parallèle pour minimiser la latence.
    await Promise.allSettled([
      clearServer(),
      supabase.auth.signOut({ scope: "global" }),
    ]);
    queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY });
  };
}
