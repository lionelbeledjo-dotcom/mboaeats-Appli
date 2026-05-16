/**
 * MboaEats — Legacy shim pour `useUserRoles`.
 *
 * @deprecated Préférez `useSession()` qui expose directement
 *   `isPlatformAdmin`, `isPlatformSuperadmin`, `isDriver`, `hasMembership(rid, role)`.
 *
 * L'ancien type `AppRole` confondait rôles plateforme (admin/superadmin/livreur)
 * et rôle "restaurateur" (= membership tenant). Le nouveau système les sépare :
 *   - PlatformRole : 'admin' | 'superadmin' | 'livreur'
 *   - RestaurantRole : 'owner' | 'manager' | 'staff' | 'kitchen'
 *
 * Ce shim conserve l'API `has('restaurateur')` pour les composants legacy :
 *   - `has('admin')`        → isPlatformAdmin
 *   - `has('superadmin')`   → isPlatformSuperadmin
 *   - `has('livreur')`      → isDriver
 *   - `has('restaurateur')` → true si le user a AU MOINS UNE membership active
 *                            avec rôle >= 'staff'  (équivalent fonctionnel)
 *   - `has('client')`       → toujours true si authentifié (= signification implicite)
 */

import { useSession } from "@/auth/hooks/useSession";

export type AppRole =
  | "client"
  | "restaurateur"
  | "livreur"
  | "admin"
  | "superadmin";

/**
 * @deprecated Utilisez `useSession()` et les helpers `isPlatformAdmin`,
 *   `hasMembership(rid, role)`, etc.
 */
export function useUserRoles() {
  const {
    isLoading,
    isAuthenticated,
    principal,
    isPlatformAdmin,
    isPlatformSuperadmin,
    isDriver,
  } = useSession();

  const hasAnyStaffMembership =
    !!principal &&
    principal.memberships.some(
      (m) => m.status === "active" && m.role !== "kitchen",
    );

  const roles: AppRole[] = [];
  if (isAuthenticated) roles.push("client");
  if (isDriver) roles.push("livreur");
  if (isPlatformAdmin) roles.push("admin");
  if (isPlatformSuperadmin) roles.push("superadmin");
  if (hasAnyStaffMembership) roles.push("restaurateur");

  const has = (r: AppRole): boolean => {
    switch (r) {
      case "client":
        return isAuthenticated;
      case "livreur":
        return isDriver;
      case "admin":
        return isPlatformAdmin;
      case "superadmin":
        return isPlatformSuperadmin;
      case "restaurateur":
        return hasAnyStaffMembership;
      default:
        return false;
    }
  };

  return { roles, has, loading: isLoading };
}
