/**
 * MboaEats — AuthGate racine.
 *
 * Garde-fou top-level qui redirige vers /connexion si la route n'est pas
 * publique et que l'utilisateur n'est pas authentifié.
 *
 * Refonte vs ancien AuthGate (__root.tsx) :
 *   - Source d'auth = useSession() (JWT) au lieu de useSessionUser() (cookie maison)
 *   - Liste des routes publiques durcie : `/admin/*` n'est PLUS publique
 *     (corrige audit H1). Seul `/admin/login` reste public.
 *   - Le mode `?preview=1` est supprimé : trop facile à oublier, créait un
 *     bypass non maîtrisable. Pour démos / previews, utiliser une route
 *     dédiée `/preview/r/$slug` qui lit seulement les colonnes publiques.
 */

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/auth/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mode FERMÉ : l'utilisateur DOIT être connecté pour accéder à l'app.
 * Seules les pages d'auth, d'info légale et la landing sont publiques.
 */
const PUBLIC_ROUTES: ReadonlyArray<string> = [
  "/",
  "/connexion",
  "/inscription",
  "/reset-password",
  "/devenir-resto",
  "/restaurant/connexion",
  "/devenir-livreur",
  "/livreur/connexion",
  "/admin/login",
  "/admin/unauthorized",
  "/superadmin/login",
  "/healthcheck",
  "/aide",
  "/contact",
  "/cgu",
  "/confidentialite",
];

const PUBLIC_PREFIXES: ReadonlyArray<string> = ["/aide/"];

function isPublicPath(path: string): boolean {
  if (PUBLIC_ROUTES.includes(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const publicRoute = isPublicPath(path);

  // Lecture synchrone du cache Supabase (localStorage) au mount : évite la
  // page blanche quand `useSession` est en cours de fetch mais qu'une session
  // existe déjà en cache navigateur.
  const [sbHasSession, setSbHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSbHasSession(!!data.session);
    }).catch(() => alive && setSbHasSession(false));
    return () => { alive = false; };
  }, []);

  // Tant qu'on n'a pas la réponse Supabase + la query principal, on considère
  // l'utilisateur potentiellement connecté → on rend l'enfant. Évite le flash
  // blanc qui obligeait à recharger.
  const settled = !isLoading && sbHasSession !== null;
  const trulyUnauthed = settled && !isAuthenticated && !sbHasSession;

  useEffect(() => {
    if (!trulyUnauthed || publicRoute) return;
    const search =
      typeof location.search === "string"
        ? location.search
        : new URLSearchParams(location.search as Record<string, string>).toString();
    const target = search ? `${path}?${search}` : path;
    navigate({
      to: "/connexion",
      replace: true,
      search: { redirect: target },
    });
  }, [trulyUnauthed, publicRoute, navigate, path, location.search]);

  if (publicRoute) return <>{children}</>;
  // Session présente en cache → on rend immédiatement (pas de flash).
  if (sbHasSession || isAuthenticated) return <>{children}</>;
  // Vérification en cours → FullScreenLoader, jamais le contenu protégé.
  if (!settled) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  // Settled & non authentifié → la redirection est en cours, on n'affiche rien.
  return null;
}
