/**
 * MboaEats — Legacy shim pour `useAuth`
 *
 * @deprecated Utilisez `useSession` depuis `@/auth/hooks/useSession`.
 *
 * Ce fichier maintient la signature publique de l'ancien `useAuth` pour
 * que le code legacy continue à compiler pendant la migration. À supprimer
 * après le sweep complet des imports (cf. tâche M-deprecate-hooks).
 */

import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useSignOut } from "@/auth/hooks/useSession";

/**
 * @deprecated Préférez `useSession()` qui expose principal + permissions.
 */
export function useAuth() {
  const { isLoading, isAuthenticated, principal } = useSession();
  const signOut = useSignOut();

  // L'ancien `useAuth` exposait `session` (Supabase brut) — on continue à le
  // fournir pour les rares consumers qui en ont besoin (ex: realtime channels).
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSupabaseSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSupabaseSession(s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const user: User | null = supabaseSession?.user ?? null;

  return {
    session: supabaseSession,
    user,
    loading: isLoading,
    isAuthenticated,
    signOut,
    // Bonus : si du code legacy veut le principal MboaEats
    principal,
  };
}
