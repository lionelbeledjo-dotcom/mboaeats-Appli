/**
 * MboaEats — Hooks de membership tenant
 *
 * `useMyMemberships()`     : liste des memberships du user courant
 * `useCurrentMembership()` : membership pour le resto sélectionné (Zustand store)
 */

import { useMemo } from "react";
import { useSession } from "./useSession";
import { useCurrentRestaurantId } from "./useCurrentRestaurant";
import { findMembership, hasMinRestaurantRole, type RestaurantRole } from "@/auth/types";

/** Liste des memberships actifs du user. */
export function useMyMemberships() {
  const { principal } = useSession();
  return useMemo(
    () => principal?.memberships ?? [],
    [principal?.memberships],
  );
}

/**
 * Membership pour le restaurant actuellement sélectionné dans l'UI.
 * Le selector du resto courant est dans `useCurrentRestaurantId` (Zustand).
 */
export function useCurrentMembership() {
  const { principal } = useSession();
  const restaurantId = useCurrentRestaurantId();

  return useMemo(() => {
    if (!principal || !restaurantId) return null;
    return findMembership(principal, restaurantId);
  }, [principal, restaurantId]);
}

/** True si l'user a au moins `minRole` dans le resto courant. */
export function useHasCurrentRole(minRole: RestaurantRole): boolean {
  const membership = useCurrentMembership();
  if (!membership) return false;
  return hasMinRestaurantRole(membership.role, minRole);
}
