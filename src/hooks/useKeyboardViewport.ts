import { useEffect } from "react";

/**
 * Stabilise l'UI mobile quand le clavier virtuel s'ouvre :
 * - expose --kb-inset (hauteur du clavier) sur :root via visualViewport
 * - empêche le "saut" de la page en bloquant le scroll automatique du focus
 * - ramène doucement le champ focus dans le viewport visible
 */
export function useKeyboardViewport() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const root = document.documentElement;

    const setInset = () => {
      if (!vv) {
        root.style.setProperty("--kb-inset", "0px");
        return;
      }
      // Hauteur masquée par le clavier (≈ inset bas)
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb-inset", `${Math.round(inset)}px`);
      document.body.classList.toggle("kb-open", inset > 80);
    };

    setInset();
    vv?.addEventListener("resize", setInset);
    vv?.addEventListener("scroll", setInset);
    window.addEventListener("orientationchange", setInset);

    // Empêche le navigateur de "scroller" toute la page lors du focus,
    // puis ramène le champ visible avec une animation douce.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !(t as HTMLElement).isContentEditable) return;
      // laisse le clavier s'ouvrir, puis ajuste
      window.setTimeout(() => {
        try {
          t.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          /* noop */
        }
      }, 250);
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      vv?.removeEventListener("resize", setInset);
      vv?.removeEventListener("scroll", setInset);
      window.removeEventListener("orientationchange", setInset);
      document.removeEventListener("focusin", onFocusIn);
      document.body.classList.remove("kb-open");
      root.style.removeProperty("--kb-inset");
    };
  }, []);
}
