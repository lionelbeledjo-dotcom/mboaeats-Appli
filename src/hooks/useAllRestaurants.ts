import { useMemo } from "react";
import { useDbRestaurants, type RestaurantWithDb } from "./useDbRestaurants";
import { restaurants as seedRestaurants } from "@/data/restaurants";

export function useAllRestaurants() {
  const { data: dbRestos, isLoading, error } = useDbRestaurants();

  const all: RestaurantWithDb[] = useMemo(
    () => [...(dbRestos ?? []), ...seedRestaurants],
    [dbRestos],
  );

  return { data: all, isLoading, error, dbRestos: dbRestos ?? [] };
}
