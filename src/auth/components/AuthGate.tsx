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
 * Liste explicite des routes accessibles sans login.
 * On préfère la liste explicite à un wildcard `/admin` → impossible d'oublier
 * une route admin protégée.
 */
const PUBLIC_ROUTES: ReadonlyArray<string> = [
  "/",
  "/connexion",
  "/inscription",
  "/reset-password",
  "/cgu",
  "/confidentialite",
  "/healthcheck",
  "/recherche",
  "/explorer",
  "/panier",
  "/commandes",
  "/profil",
  "/cuisines",
  "/proximite",
  "/populaire",
  "/decouvrir",
  "/aide",
  "/contact",
  "/devenir-livreur",
  "/devenir-resto",
  "/mboapass",
  "/parrainage",
  "/favoris",
  "/admin/login",
  "/superadmin/login",
];

const PUBLIC_PREFIXES: ReadonlyArray<string> = [
  "/r/",            // restaurant public
  "/restaurants/",  // ancienne URL resto
  "/categorie/",
  "/aide/",
];

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
    const target = path + location.search;
    navigate({
      to: "/connexion",
      replace: true,
      search: { redirect: target },
    });
  }, [trulyUnauthed, publicRoute, navigate, path, location.search]);

  if (publicRoute) return <>{children}</>;
  // Si Supabase a une session en cache, on rend l'enfant tout de suite
  // (la page peut afficher son skeleton local pendant que le JWT arrive).
  if (sbHasSession || isAuthenticated) return <>{children}</>;
  // Premier check pas encore terminé → skeleton minimal au lieu de null
  if (!settled) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  return null;
}
