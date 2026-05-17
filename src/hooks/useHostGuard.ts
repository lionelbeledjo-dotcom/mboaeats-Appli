import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subdomain gating.
 *
 * - admin.mboaeat.site  → uniquement /admin/*. Tout autre chemin redirige vers /admin.
 *                         Session admin expire après 15 min d'inactivité.
 * - mboaeat.site / www  → /admin/* est bloqué et redirigé vers /.
 * - Autres hosts (preview Lovable, localhost, custom)  → aucune restriction.
 *
 * Le contrôle de rôle (admin / superadmin) reste géré par `admin.tsx`
 * (redirige vers /admin/login si non connecté, /admin/unauthorized si non admin).
 */
const ADMIN_HOSTS = new Set(["admin.mboaeat.site", "admin.mboaeats.com"]);
const CLIENT_HOSTS = new Set([
  "mboaeat.site",
  "www.mboaeat.site",
  "mboaeats.com",
  "www.mboaeats.com",
  "mboaeats.lovable.app",
]);

const ADMIN_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export type HostMode = "admin" | "client" | "any";

export function getHostMode(hostname: string | undefined): HostMode {
  if (!hostname) return "any";
  const h = hostname.toLowerCase();
  if (ADMIN_HOSTS.has(h)) return "admin";
  if (CLIENT_HOSTS.has(h)) return "client";
  return "any";
}

export function useHostMode(): HostMode {
  return useMemo(
    () => (typeof window === "undefined" ? "any" : getHostMode(window.location.hostname)),
    [],
  );
}

export function useHostGuard() {
  const mode = useHostMode();
  const location = useLocation();
  const navigate = useNavigate();
  const idleTimerRef = useRef<number | null>(null);

  // Subdomain routing
  useEffect(() => {
    if (mode === "any") return;
    const path = location.pathname;
    const isAdminPath = path === "/admin" || path.startsWith("/admin/");

    if (mode === "admin" && !isAdminPath) {
      navigate({ to: "/admin", replace: true });
    } else if (mode === "client" && isAdminPath) {
      navigate({ to: "/", replace: true });
    }
  }, [mode, location.pathname, navigate]);

  // 15-minute idle timeout on admin subdomain
  useEffect(() => {
    if (mode !== "admin" || typeof window === "undefined") return;
    if (location.pathname === "/admin/login") return;

    const reset = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(async () => {
        try { await supabase.auth.signOut({ scope: "local" }); } catch {}
        navigate({ to: "/admin/login", replace: true });
      }, ADMIN_IDLE_TIMEOUT_MS);
    };

    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [mode, location.pathname, navigate]);

  return mode;
}

