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

import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/auth/hooks/useSession";

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

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !publicRoute) {
      // Préserve la cible pour redirection post-login
      const target = path + location.search;
      navigate({
        to: "/connexion",
        replace: true,
        search: { redirect: target },
      });
    }
  }, [isLoading, isAuthenticated, publicRoute, navigate, path, location.search]);

  // Routes publiques : render immédiat, pas d'attente
  if (publicRoute) return <>{children}</>;
  // Routes protégées : on attend la résolution de l'auth
  if (isLoading) return null;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
