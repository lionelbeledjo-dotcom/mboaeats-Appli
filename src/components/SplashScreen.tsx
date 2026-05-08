import { useEffect, useState } from "react";
import { MboaEatsLogo } from "@/components/brand/MboaEatsLogo";

const STORAGE_KEY = "mboaeats:splash:shown";
const VISIBLE_MS = 2500;
const EXIT_MS = 600;

/**
 * Full-screen splash shown once per browser session on initial app launch.
 * - Fade-in + zoom of the MboaEats logo
 * - Stays 2.5s
 * - Slide-up + fade-out (600ms) then unmounts and reveals the route below
 */
export function SplashScreen() {
  // Decide synchronously on the client whether to show, to avoid a flash.
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
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        opacity: exiting ? 0 : 1,
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
    >
      <div className="splash-logo-anim">
        <MboaEatsLogo size="xl" align="center" variant="filled" badgeSize="md" />
      </div>

      <style>{`
        @keyframes splashLogoIn {
          0% {
            opacity: 0;
            transform: scale(0.86);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: scale(1.02);
          }
        }
        .splash-logo-anim {
          animation: splashLogoIn 1500ms cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-logo-anim { animation: none; }
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;
