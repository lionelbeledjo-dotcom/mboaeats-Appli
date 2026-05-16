import { useEffect } from "react";

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

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    // Sauvegarde des styles actuels pour restitution fidèle
    const prev = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    // Compense la disparition de la scrollbar (desktop) pour éviter le shift
    const scrollbarW = window.innerWidth - html.clientWidth;
    const prevPaddingRight = body.style.paddingRight;
    if (scrollbarW > 0) {
      body.style.paddingRight = `${scrollbarW}px`;
    }

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      body.style.paddingRight = prevPaddingRight;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      // Restaure la position de scroll exacte sans animation
      window.scrollTo(0, scrollY);
    };
  }, [enabled]);
}
