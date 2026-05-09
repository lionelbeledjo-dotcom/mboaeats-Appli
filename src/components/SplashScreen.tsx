import { useEffect, useState } from "react";

const STORAGE_KEY = "mboaeats:splash:shown";

// Timings (ms)
const LETTERS = "MboaEats";
const LETTER_STAGGER = 35;
const LETTER_DURATION = 220;
const TYPEWRITER_TOTAL = (LETTERS.length - 1) * LETTER_STAGGER + LETTER_DURATION;
const BADGE_DELAY = TYPEWRITER_TOTAL + 40;
const BADGE_DURATION = 220;
const HOLD_AFTER_COMPLETE = 200;
const VISIBLE_MS = BADGE_DELAY + BADGE_DURATION + HOLD_AFTER_COMPLETE;
const EXIT_MS = 280;

const MBOA = "Mboa";
const EATS = "Eats";

/**
 * Splash plein écran joué une fois par session.
 * - Fond blanc pur (#FFFFFF)
 * - Le mot "MboaEats" s'écrit lettre par lettre (machine à écrire fluide)
 * - "Mboa" : blanc avec contour gris léger pour rester lisible sur blanc
 * - "Eats" : vert UberEats (#06C167)
 * - Badge "🇨🇲 LIVRAISON CAMEROUN" en fade-in au-dessus une fois le mot terminé
 * - Pause 1s puis sortie en zoom-out + fade
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
        transition: `transform ${EXIT_MS}ms cubic-bezier(0.65,0,0.35,1), opacity ${EXIT_MS}ms ease-out`,
        transform: exiting ? "scale(1.12)" : "scale(1)",
        opacity: exiting ? 0 : 1,
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-white"
    >
      {/* Texte accessible (lecteurs d'écran) — la version visuelle ci-dessous est aria-hidden */}
      <span className="sr-only">MboaEats — Livraison Cameroun</span>

      {/* Badge 🇨🇲 LIVRAISON CAMEROUN */}
      <div className="splash-badge" aria-hidden="true">
        <span className="text-base leading-none" role="img" aria-label="Drapeau du Cameroun">🇨🇲</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-700">
          Livraison Cameroun
        </span>
      </div>

      {/* Mot animé lettre par lettre */}
      <h1
        className="splash-word font-display select-none text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl"
        aria-hidden="true"
      >
        {MBOA.split("").map((ch, i) => (
          <span
            key={`m-${i}`}
            className="splash-letter splash-letter--mboa"
            style={{ animationDelay: `${i * LETTER_STAGGER}ms` }}
          >
            {ch}
          </span>
        ))}
        {EATS.split("").map((ch, i) => (
          <span
            key={`e-${i}`}
            className="splash-letter splash-letter--eats"
            style={{ animationDelay: `${(MBOA.length + i) * LETTER_STAGGER}ms` }}
          >
            {ch}
          </span>
        ))}
      </h1>

      <style>{`
        @keyframes splashLetterIn {
          0%   { opacity: 0; transform: translateY(14px) scale(0.92); filter: blur(4px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes splashBadgeIn {
          0%   { opacity: 0; transform: translateY(-6px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .splash-word {
          display: inline-flex;
          line-height: 1;
        }
        .splash-letter {
          display: inline-block;
          opacity: 0;
          animation: splashLetterIn ${LETTER_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity, filter;
        }
        .splash-letter--mboa {
          color: #ffffff;
          /* Contour gris léger + ombre douce pour rester lisible sur fond blanc */
          -webkit-text-stroke: 1.25px #1f2937; /* gris-800 */
          text-shadow:
            0 1px 0 rgba(15, 23, 42, 0.08),
            0 6px 18px rgba(15, 23, 42, 0.10);
        }
        .splash-letter--eats {
          color: #06c167; /* Vert UberEats */
        }

        .splash-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.9rem;
          border-radius: 9999px;
          background: #f8fafc; /* slate-50 */
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 6px 16px -8px rgba(15, 23, 42, 0.18);
          opacity: 0;
          animation: splashBadgeIn ${BADGE_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: ${BADGE_DELAY}ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-letter,
          .splash-badge {
            animation: none;
            opacity: 1;
            transform: none;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;
