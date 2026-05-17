import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

/**
 * Subdomain gating.
 *
 * - admin.mboaeat.site  → uniquement /admin/*. Tout autre chemin redirige vers /admin.
 * - mboaeat.site / www  → /admin/* est bloqué et redirigé vers /.
 * - Autres hosts (preview Lovable, localhost, custom)  → aucune restriction.
 *
 * Le contrôle de rôle (admin / superadmin) reste géré par `admin.tsx`
 * (redirige vers /admin/login si l'utilisateur n'est pas admin).
 */
const ADMIN_HOSTS = new Set(["admin.mboaeat.site", "admin.mboaeats.com"]);
const CLIENT_HOSTS = new Set([
  "mboaeat.site",
  "www.mboaeat.site",
  "mboaeats.com",
  "www.mboaeats.com",
  "mboaeats.lovable.app",
]);

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

  return mode;
}
