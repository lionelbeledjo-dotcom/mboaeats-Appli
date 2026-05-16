/**
 * MboaEats — AuthProvider racine.
 *
 * À monter UNE FOIS dans `__root.tsx`, à l'intérieur du QueryClientProvider.
 *
 * Responsabilités :
 *   - Bloquer le render des enfants tant que `supabase.auth.getSession()`
 *     n'a pas rendu un verdict (présence/absence de session). Cela évite la
 *     race condition où Profil / Commandes lancent leur fetch avant que le
 *     bearer token soit attaché → 401 → "Une erreur est survenue".
 *   - Synchroniser les events Supabase Auth → React Query
 *     (useSyncSupabaseAuthEvents).
 *   - Initialiser le restaurant courant (useSyncCurrentRestaurant).
 *
 * Le gate session est volontairement minimal (mini loader) : il dure
 * typiquement <100 ms (lecture localStorage), donc invisible en pratique.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useSyncSupabaseAuthEvents } from "@/auth/hooks/useSession";
import { useSyncCurrentRestaurant } from "@/auth/hooks/useCurrentRestaurant";
import { supabase } from "@/integrations/supabase/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  useSyncSupabaseAuthEvents();
  useSyncCurrentRestaurant();

  // Attente du verdict initial de Supabase (présence ou non d'une session
  // restaurée depuis le storage). Sans ça, les server-fn protégées peuvent
  // partir sans bearer token et renvoyer 401 au premier paint.
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .catch(() => null)
      .finally(() => {
        if (alive) setSessionReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!sessionReady) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        aria-busy="true"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
