import { useMemo } from "react";

const ADMIN_HOSTS = new Set(["admin.mboaeat.site", "admin.mboaeats.com"]);
const RESTAURANT_HOSTS = new Set([
  "restaurant.mboaeat.site",
  "restaurant.mboaeats.com",
]);
const CLIENT_HOSTS = new Set([
  "mboaeat.site",
  "www.mboaeat.site",
  "mboaeats.com",
  "www.mboaeats.com",
  "mboaeats.lovable.app",
]);

export type HostMode = "admin" | "restaurant" | "client" | "any";

export function getHostMode(hostname?: string): HostMode {
  if (!hostname) {
    if (typeof window === "undefined") return "any";
    hostname = window.location.hostname;
  }
  const h = hostname.toLowerCase();
  if (ADMIN_HOSTS.has(h)) return "admin";
  if (RESTAURANT_HOSTS.has(h)) return "restaurant";
  if (CLIENT_HOSTS.has(h)) return "client";
  return "any";
}

export function useHostMode(): HostMode {
  return useMemo(
    () => (typeof window === "undefined" ? "any" : getHostMode(window.location.hostname)),
    [],
  );
}
