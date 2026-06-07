import { useEffect, useState } from "react";

const STORAGE_KEY = "mboaeats:splash:shown";
const VISIBLE_MS = 2400;
const EXIT_MS = 500;

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
    } catch {}
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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        transition: `opacity ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.1)" : "scale(1)",
        background: "linear-gradient(160deg, #1A7D42 0%, #22C55E 50%, #16A34A 100%)",
      }}
    >
      <span className="sr-only">MboaEats — Livraison Cameroun</span>

      {/* Cercles de pulse en arrière-plan */}
      <div className="splash-ring splash-ring-1" />
      <div className="splash-ring splash-ring-2" />
      <div className="splash-ring splash-ring-3" />

      {/* Logo principal animé */}
      <div className="splash-logo-container">
        <div className="splash-icon-bounce">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="splash-icon-svg">
            <circle cx="40" cy="40" r="40" fill="white" fillOpacity="0.15" />
            <circle cx="40" cy="40" r="30" fill="white" />
            <text x="40" y="48" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#16A34A">M</text>
          </svg>
        </div>

        <h1
          className="splash-text-reveal select-none text-white text-5xl font-extrabold tracking-tight sm:text-6xl mt-5"
          style={{ fontFamily: "Poppins, Inter, sans-serif" }}
          aria-hidden="true"
        >
          Mboa<span style={{ color: "#BBF7D0" }}>Eats</span>
        </h1>

        <div className="splash-tagline flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm mt-4 border border-white/20">
          <span role="img" aria-label="Drapeau du Cameroun">🇨🇲</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
            Livraison Cameroun
          </span>
        </div>
      </div>

      {/* Indicateur de chargement */}
      <div className="splash-loader mt-10">
        <div className="splash-loader-bar" />
      </div>

      <style>{`
        .splash-logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .splash-icon-bounce {
          animation: iconBounce 800ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .splash-icon-svg {
          filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.15));
        }

        .splash-text-reveal {
          animation: textReveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both;
        }

        .splash-tagline {
          animation: taglineSlide 500ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both;
        }

        .splash-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.1);
          pointer-events: none;
        }

        .splash-ring-1 {
          width: 200px;
          height: 200px;
          animation: ringPulse 2s ease-out 200ms infinite;
        }

        .splash-ring-2 {
          width: 300px;
          height: 300px;
          animation: ringPulse 2s ease-out 600ms infinite;
        }

        .splash-ring-3 {
          width: 420px;
          height: 420px;
          animation: ringPulse 2s ease-out 1000ms infinite;
        }

        .splash-loader {
          width: 48px;
          height: 4px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.2);
          overflow: hidden;
          position: relative;
          z-index: 2;
          animation: loaderFadeIn 400ms ease 800ms both;
        }

        .splash-loader-bar {
          width: 100%;
          height: 100%;
          border-radius: 4px;
          background: white;
          animation: loaderSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) 900ms infinite;
          transform-origin: left;
        }

        @keyframes iconBounce {
          0%   { opacity: 0; transform: scale(0) rotate(-20deg); }
          50%  { transform: scale(1.15) rotate(5deg); }
          75%  { transform: scale(0.95) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes textReveal {
          0%   { opacity: 0; transform: translateY(20px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes taglineSlide {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes ringPulse {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        @keyframes loaderFadeIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes loaderSlide {
          0%   { transform: scaleX(0); transform-origin: left; }
          50%  { transform: scaleX(1); transform-origin: left; }
          51%  { transform-origin: right; }
          100% { transform: scaleX(0); transform-origin: right; }
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-icon-bounce,
          .splash-text-reveal,
          .splash-tagline,
          .splash-ring,
          .splash-loader-bar {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;
