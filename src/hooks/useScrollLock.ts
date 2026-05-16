import { useEffect } from "react";

let lockCount = 0;
let restoreState: null | {
  scrollY: number;
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  htmlOverscroll: string;
  htmlScrollBehavior: string;
} = null;

/**
 * Verrouille le scroll du document (body + html) pendant que le composant
 * appelant est monté, puis le restaure exactement à la position d'origine
 * en démontage. Garantit que la page ne "saute" pas à l'ouverture/fermeture
 * d'un overlay plein écran (panier, modal, drawer).
 *
 * Implémentation iOS-safe : on fige body en `position: fixed; top: -scrollY`
 * pour empêcher le rubber-band sous WebKit, puis on restaure `scrollTo` au
 * cleanup. C'est la seule méthode qui marche sur Safari mobile.
 */
export function useScrollLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const body = document.body;
    const html = document.documentElement;
    lockCount += 1;

    if (lockCount === 1) {
      restoreState = {
        scrollY: window.scrollY,
        bodyOverflow: body.style.overflow,
        bodyPaddingRight: body.style.paddingRight,
        htmlOverflow: html.style.overflow,
        htmlOverscroll: html.style.overscrollBehavior,
        htmlScrollBehavior: html.style.scrollBehavior,
      };

      const scrollbarW = window.innerWidth - html.clientWidth;
      if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;

      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      html.style.scrollBehavior = "auto";
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0 || !restoreState) return;
      const y = restoreState.scrollY;
      body.style.overflow = restoreState.bodyOverflow;
      body.style.paddingRight = restoreState.bodyPaddingRight;
      html.style.overflow = restoreState.htmlOverflow;
      html.style.overscrollBehavior = restoreState.htmlOverscroll;
      html.style.scrollBehavior = restoreState.htmlScrollBehavior;
      restoreState = null;
      requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior }));
    };
  }, [enabled]);
}
