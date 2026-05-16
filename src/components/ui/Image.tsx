/**
 * MboaEats — Composant <Image> optimisé.
 *
 * Pourquoi pas <img> direct ?
 *
 *   1. LAZY LOADING par défaut : sauf hero (priority), les images ne sont
 *      téléchargées que quand elles approchent du viewport. Sur la home
 *      avec 12 restos, on économise 11 téléchargements initiaux.
 *
 *   2. DIMENSIONS FIXES : width/height obligatoires → le navigateur réserve
 *      l'espace correct AVANT que l'image arrive → 0 CLS (Cumulative Layout
 *      Shift). Sans ça, le contenu saute quand les images chargent.
 *
 *   3. SRCSET RESPONSIVE : on demande à Supabase Storage de générer
 *      automatiquement des versions plus petites pour les écrans mobiles
 *      via les transformations d'images Supabase (?width=X&quality=70).
 *      Gain typique : -60% à -80% de poids sur mobile.
 *
 *   4. ASYNC DECODE : `decoding="async"` ne bloque pas le main thread.
 *
 *   5. FALLBACK : si l'image plante, on affiche un placeholder gris coloré
 *      avec l'initiale (utile pour les restos sans photo).
 *
 * Usage :
 *
 *   // Image principale, prioritaire (above fold)
 *   <Image src={r.image_url} alt={r.name} width={400} height={300} priority />
 *
 *   // Carte resto dans une liste (lazy par défaut)
 *   <Image src={r.image_url} alt={r.name} width={160} height={120} />
 */

import { useState } from "react";

interface Props {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  /** Si true, charge immédiatement (above fold). Sinon lazy. */
  priority?: boolean;
  className?: string;
  /** Largeurs alternatives pour srcset. Auto si supabase storage. */
  sizes?: string;
  /** Fallback à afficher si pas de src. Utile pour cartes restos. */
  fallbackLabel?: string;
}

/**
 * Génère un srcset si l'URL pointe vers Supabase Storage (qui supporte
 * les transformations à la volée).
 */
function buildSrcSet(src: string, width: number): string | undefined {
  // Détecte une URL Supabase Storage typique
  if (!src.includes("/storage/v1/object/")) return undefined;

  // Supabase transformations : .../render/image/public/... avec query params
  const transformBase = src.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/",
  );

  const sep = transformBase.includes("?") ? "&" : "?";
  const widths = [width, width * 2]; // 1x et 2x (retina)
  return widths
    .map((w) => `${transformBase}${sep}width=${w}&quality=75 ${w}w`)
    .join(", ");
}

export function Image({
  src,
  alt,
  width,
  height,
  priority,
  className,
  sizes,
  fallbackLabel,
}: Props) {
  const [err, setErr] = useState(false);

  if (!src || err) {
    // Fallback : placeholder coloré stable (dérivé du label)
    const label = fallbackLabel ?? alt;
    const initial = (label?.[0] ?? "?").toUpperCase();
    return (
      <div
        role="img"
        aria-label={alt}
        style={{ width, height }}
        className={`flex items-center justify-center rounded-md bg-muted text-2xl font-bold text-muted-foreground ${
          className ?? ""
        }`}
      >
        {initial}
      </div>
    );
  }

  const srcSet = buildSrcSet(src, width);
  const transformed = srcSet
    ? src.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/",
      ) + (src.includes("?") ? "&" : "?") + `width=${width}&quality=75`
    : src;

  return (
    <img
      src={transformed}
      srcSet={srcSet}
      sizes={sizes ?? `${width}px`}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setErr(true)}
      className={className}
    />
  );
}
