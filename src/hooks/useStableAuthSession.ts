import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/auth/hooks/useSession";

export function useStableAuthSession() {
  const session = useSession();
  const [ready, setReady] = useState(false);
  const [hasBrowserSession, setHasBrowserSession] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.error("[auth/session] getSession", error);
        setHasBrowserSession(!!data.session);
        setReady(true);
      })
      .catch((error) => {
        console.error("[auth/session] getSession exception", error);
        if (alive) {
          setHasBrowserSession(false);
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const isResolving = !ready || session.isLoading;
  const isAuthenticated = session.isAuthenticated || !!hasBrowserSession;

  return {
    ...session,
    authReady: ready,
    hasBrowserSession,
    isResolving,
    isAuthenticated,
  };
}