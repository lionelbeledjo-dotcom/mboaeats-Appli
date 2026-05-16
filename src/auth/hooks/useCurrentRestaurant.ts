/**
 * MboaEats — Store du restaurant actuellement sélectionné (côté staff).
 *
 * Pour un user qui est membre de N restaurants, on a besoin de savoir
 * "lequel je gère maintenant". On stocke ce choix dans Zustand (persisté
 * en localStorage) + on expose un hook pour lire/écrire.
 *
 * Auto-init : si le store est vide et que le user a exactement 1 membership,
 * on sélectionne automatiquement ce resto.
 */

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMyMemberships } from "./useMembership";

interface CurrentRestaurantState {
  restaurantId: string | null;
  setRestaurantId: (id: string | null) => void;
}

const useCurrentRestaurantStore = create<CurrentRestaurantState>()(
  persist(
    (set) => ({
      restaurantId: null,
      setRestaurantId: (id) => set({ restaurantId: id }),
    }),
    {
      name: "mboa.current_restaurant",
      version: 1,
    },
  ),
);

export function useCurrentRestaurantId(): string | null {
  return useCurrentRestaurantStore((s) => s.restaurantId);
}

export function useSetCurrentRestaurantId() {
  return useCurrentRestaurantStore((s) => s.setRestaurantId);
}

/**
 * Hook à monter dans AuthProvider : initialise automatiquement le resto
 * courant à partir des memberships du user.
 */
export function useSyncCurrentRestaurant() {
  const memberships = useMyMemberships();
  const restaurantId = useCurrentRestaurantId();
  const setRestaurantId = useSetCurrentRestaurantId();

  useEffect(() => {
    // Cas 1 : pas de resto sélectionné mais une seule membership → auto-select
    if (!restaurantId && memberships.length === 1) {
      setRestaurantId(memberships[0]!.restaurant_id);
      return;
    }
    // Cas 2 : un resto sélectionné mais le user n'y est plus membre → reset
    if (
      restaurantId &&
      !memberships.some((m) => m.restaurant_id === restaurantId)
    ) {
      setRestaurantId(memberships[0]?.restaurant_id ?? null);
    }
  }, [memberships, restaurantId, setRestaurantId]);
}
