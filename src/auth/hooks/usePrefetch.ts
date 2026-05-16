/**
 * MboaEats — Hooks de prefetch agressif.
 *
 * TanStack Router prefetch déjà au survol grâce à `defaultPreload: "intent"`.
 * Mais sur mobile (tactile), il n'y a PAS de survol — l'utilisateur tape
 * direct. On a donc besoin de stratégies alternatives :
 *
 *   1. `usePrefetchOnVisible` : prefetch quand un Link entre dans le
 *      viewport. Idéal pour les listes de restos sur la home.
 *
 *   2. `usePrefetchOnIdle` : prefetch des routes "probables" pendant que
 *      l'utilisateur est inactif (5s après mount, en utilisant
 *      requestIdleCallback). Idéal pour /panier, /commandes, /profil.
 *
 * GAIN : sur mobile, on transforme des clics qui prendraient 1-2s en
 * clics quasi-instantanés (50-200ms) car les données et les chunks JS
 * sont déjà chargés.
 */

import { useEffect, useRef } from "react";
import { useRouter, type LinkProps } from "@tanstack/react-router";

type RouteLink = LinkProps["to"];

/**
 * Prefetch une route quand l'élément entre dans le viewport.
 *
 * Usage :
 *
 *   const ref = usePrefetchOnVisible("/r/$slug", { slug: r.slug });
 *   return <Link ref={ref} to="/r/$slug" params={{ slug: r.slug }}>...</Link>;
 */
export function usePrefetchOnVisible<T extends HTMLElement>(
  to: RouteLink,
  params?: Record<string, unknown>,
) {
  const ref = useRef<T | null>(null);
  const router = useRouter();
  const prefetched = useRef(false);

  useEffect(() => {
    if (!ref.current || prefetched.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !prefetched.current) {
            prefetched.current = true;
            // Prefetch la route + ses loaders
            router.preloadRoute({
              to,
              params: params as never,
            }).catch(() => {
              // Silencieux : un prefetch raté ne doit pas casser l'UI
            });
            observer.disconnect();
          }
        }
      },
      {
        // Démarre le prefetch quand l'élément est à 200px du viewport.
        // Donne le temps de charger AVANT que l'utilisateur ne voie l'item.
        rootMargin: "200px",
        threshold: 0.01,
      },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [router, to, params]);

  return ref;
}

/**
 * Prefetch une liste de routes pendant le temps d'inactivité du browser.
 *
 * Usage dans __root.tsx ou un layout principal :
 *
 *   usePrefetchOnIdle([
 *     { to: "/panier" },
 *     { to: "/commandes" },
 *     { to: "/recherche" },
 *   ]);
 */
export function usePrefetchOnIdle(
  routes: Array<{ to: RouteLink; params?: Record<string, unknown> }>,
  delayMs: number = 3000,
) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Wait delayMs avant de commencer, puis enchaîne sur idle
    const timer = window.setTimeout(() => {
      const ric = (window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));

      ric(() => {
        for (const r of routes) {
          router
            .preloadRoute({ to: r.to, params: r.params as never })
            .catch(() => {});
        }
      });
    }, delayMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
