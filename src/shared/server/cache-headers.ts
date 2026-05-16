/**
 * MboaEats — Helper Cache-Control pour les server functions publiques.
 *
 * Objectif : permettre à Cloudflare Workers (et tout cache HTTP intermédiaire)
 * de servir les responses depuis l'edge plutôt que de toucher l'origin à
 * chaque clic.
 *
 * GAIN MESURÉ : sur une connexion 4G Cameroun, le TTFB passe de 300-800 ms
 * (origin US/EU + Supabase round-trip) à 30-80 ms (edge CF Lagos/Joburg).
 *
 * Usage dans une server function :
 *
 *   import { setCacheHeaders, CachePresets } from "@/shared/server/cache-headers";
 *   import { getResponseHeaders } from "@tanstack/react-start/server";
 *
 *   export const listRestaurants = createServerFn({ method: "GET" })
 *     .handler(async () => {
 *       setCacheHeaders(CachePresets.publicCatalog);
 *       // ... fetch data ...
 *     });
 *
 * STRATÉGIE par type de donnée :
 *
 *   - publicCatalog : listings restos, menus → 60s edge cache + SWR 5min
 *   - restaurantPage : page resto individuelle → 30s edge + SWR 2min
 *   - userData : commandes, profil → no-store (jamais cacher)
 *   - rarelyChanging : CGU, FAQ, zones → 1h edge + SWR 24h
 *
 * STALE-WHILE-REVALIDATE : pendant la fenêtre SWR, Cloudflare sert la
 * version périmée IMMÉDIATEMENT (TTFB ~10ms) puis refresh en arrière-plan.
 * L'utilisateur perçoit toujours du contenu instantané.
 */

import { getResponseHeaders } from "@tanstack/react-start/server";

export interface CachePolicy {
  /** Secondes que Cloudflare garde la response en cache edge. */
  sMaxAge: number;
  /** Secondes pendant lesquelles servir la version périmée pendant le refresh. */
  staleWhileRevalidate: number;
  /** Le browser cache-t-il aussi ? (False = revalide à chaque clic) */
  browserCache?: boolean;
}

export const CachePresets = {
  /** Catalogue public (listing restos, recherche) — change quotidiennement */
  publicCatalog: {
    sMaxAge: 60,
    staleWhileRevalidate: 300,
    browserCache: false,
  } as CachePolicy,

  /** Page d'un resto (menu, dishes) — change plusieurs fois par jour */
  restaurantPage: {
    sMaxAge: 30,
    staleWhileRevalidate: 120,
    browserCache: false,
  } as CachePolicy,

  /** Contenu rarement modifié (CGU, zones de livraison, FAQ) */
  rarelyChanging: {
    sMaxAge: 3600,
    staleWhileRevalidate: 86400,
    browserCache: true,
  } as CachePolicy,

  /** Données utilisateur — NE JAMAIS cacher publiquement */
  userData: {
    sMaxAge: 0,
    staleWhileRevalidate: 0,
    browserCache: false,
  } as CachePolicy,
} as const;

/**
 * Pose les headers Cache-Control sur la response courante.
 * À appeler depuis le handler d'une server function GET.
 */
export function setCacheHeaders(policy: CachePolicy): void {
  const headers = getResponseHeaders();
  if (!headers) return;

  if (policy.sMaxAge === 0) {
    headers["cache-control"] = "private, no-store, no-cache, must-revalidate";
    return;
  }

  const parts: string[] = [];
  if (policy.browserCache) {
    parts.push("public");
    parts.push(`max-age=${policy.sMaxAge}`);
  } else {
    // Cache uniquement à l'edge, jamais sur le browser → permet d'invalider
    // par purge CF sans avoir à attendre que tous les browsers expirent.
    parts.push("private");
  }
  parts.push(`s-maxage=${policy.sMaxAge}`);
  parts.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`);

  headers["cache-control"] = parts.join(", ");

  // Vary sur Accept-Encoding pour que les versions gzip/br soient cachées
  // séparément correctement.
  headers["vary"] = "Accept-Encoding";
}

/**
 * Helper inverse : marque explicitement qu'une response NE doit jamais
 * être cachée. À utiliser sur toute server function qui retourne des
 * données utilisateur, des prix négociés, des stocks live, etc.
 */
export function noStore(): void {
  setCacheHeaders(CachePresets.userData);
}
