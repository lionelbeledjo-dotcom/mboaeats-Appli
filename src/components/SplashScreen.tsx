import { useEffect, useState } from "react";

const STORAGE_KEY = "mboaeats:splash:shown";
const VISIBLE_MS = 1100;
const EXIT_MS = 320;

/**
 * Splash plein écran — fond vert MboaEats #22C55E, logo blanc centré, fade-in.
 */
export function SplashScreen() {
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    const exitTimer = setTimeout(() => setExiting(true), VISIBLE_MS);
    const unmountTimer = setTimeout(() => setShow(false), VISIBLE_MS + EXIT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-label="Chargement de MboaEats"
      aria-live="polite"
      style={{
        transition: `opacity ${EXIT_MS}ms ease-out`,
        opacity: exiting ? 0 : 1,
        backgroundColor: "#22C55E",
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4"
    >
      <span className="sr-only">MboaEats — Livraison Cameroun</span>

      <div className="splash-fade-in flex flex-col items-center gap-3">
        <h1
          className="select-none text-white text-6xl font-extrabold tracking-tight sm:text-7xl"
          style={{ fontFamily: "Poppins, Inter, sans-serif" }}
          aria-hidden="true"
        >
          MboaEats
        </h1>
        <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 backdrop-blur-sm">
          <span role="img" aria-label="Drapeau du Cameroun">🇨🇲</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white">
            Livraison Cameroun
          </span>
        </div>
      </div>

      <style>{`
        @keyframes splashFadeIn {
          0%   { opacity: 0; transform: scale(0.94); }
          100% { opacity: 1; transform: scale(1); }
        }
        .splash-fade-in {
          animation: splashFadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-fade-in { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;
