/**
 * MboaEats — Legacy shim pour `useSessionUser`.
 *
 * @deprecated Utilisez `useSession()` depuis `@/auth/hooks/useSession`.
 *
 * L'ancien `useSessionUser` lisait le cookie `mboa_session` qui contenait
 * `identifier` / `phone` / `mode`. Comme ce cookie ne porte plus d'identité
 * (cf audit C8), on retourne maintenant un objet dérivé du principal JWT.
 *
 * Le champ `user.identifier` reste exposé (email ou phone) pour les
 * composants qui affichent "Bonjour {identifier}". Voir le fichier
 * `src/components/AppTopBar.tsx` pour un exemple de migration.
 */

import { useSession } from "@/auth/hooks/useSession";

export interface LegacyUser {
  identifier: string;
  mode: "email" | "phone";
  phone?: string;
  email?: string;
  loggedAt?: number;
}

/**
 * @deprecated Migrer vers useSession() — voir B.2 + B.3.
 */
export function useSessionUser() {
  const { isLoading, principal } = useSession();

  let user: LegacyUser | null = null;
  if (principal) {
    if (principal.email) {
      user = {
        identifier: principal.email,
        mode: "email",
        email: principal.email,
      };
    } else if (principal.phone) {
      user = {
        identifier: principal.phone,
        mode: "phone",
        phone: principal.phone,
      };
    } else {
      // user authentifié mais ni email ni phone visible → fallback userId
      user = {
        identifier: principal.userId,
        mode: "email",
      };
    }
  }

  return {
    user,
    loading: isLoading,
    refresh: () => {
      // Le refresh est désormais centralisé via useSession.refresh().
      // Ce shim est volontairement no-op : les consumers legacy n'ont pas
      // besoin de provoquer un refresh manuellement.
    },
  };
}

// Préserve l'API publique de l'ancien module (utilisée par OTP flow)
export function invalidateSessionCache() {
  // No-op : React Query gère son cache via les events Supabase.
  // Les anciens consumers (OTP → après verify, ils appelaient ça) doivent
  // maintenant invalider eux-mêmes via `useSession().refresh()`.
}

// Type compat
export type { LegacyUser as MboaSession };
