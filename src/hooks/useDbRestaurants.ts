import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Restaurant } from "@/data/restaurants";

export type DbRestaurantRow = {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  city: string;
  neighborhood: string | null;
  cover_url: string | null;
  image_url: string | null;
  rating: number | null;
  eta_min: number | null;
  eta_max: number | null;
  delivery_fee: number | null;
  min_order: number | null;
};

/**
 * Carte "Restaurant" enrichie d'un slug DB. Quand `dbSlug` est défini,
 * les liens des cartes doivent pointer vers /r/{slug} (page live DB)
 * et non vers /restaurants/{id} (dataset statique).
 */
export type RestaurantWithDb = Restaurant & { dbSlug?: string };

const PLACEHOLDER_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23F5F0E8'/><text x='50%' y='50%' font-family='Inter,sans-serif' font-size='48' fill='%2306C167' text-anchor='middle' dominant-baseline='central'>🍽️</text></svg>`,
  );

function adaptDbToRestaurant(row: DbRestaurantRow): RestaurantWithDb {
  const cover = row.cover_url || row.image_url || PLACEHOLDER_COVER;
  const etaMin = row.eta_min ?? 25;
  const etaMax = row.eta_max ?? 45;
  const minOrder = row.min_order && row.min_order > 0 ? row.min_order : 1500;
  return {
    id: row.id,
    name: row.name,
    tagline: `${row.cuisine} — ${row.city}${row.neighborhood ? " · " + row.neighborhood : ""}`,
    city: row.city,
    neighborhood: row.neighborhood ?? row.city,
    rating: Number(row.rating ?? 4.5),
    eta: `${etaMin}-${etaMax} min`,
    cover,
    categories: [
      {
        id: "menu",
        label: "Menu",
        dishes: [
          {
            id: "decouvrir",
            name: "Découvrir le menu",
            description: "Carte disponible sur la fiche restaurant.",
            price: minOrder,
            image: cover,
          },
        ],
      },
    ],
    dbSlug: row.slug,
  };
}

export function useDbRestaurants() {
  return useQuery({
    queryKey: ["db-restaurants-public"],
    queryFn: async (): Promise<RestaurantWithDb[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "id, slug, name, cuisine, city, neighborhood, cover_url, image_url, rating, eta_min, eta_max, delivery_fee, min_order",
        )
        .eq("is_active", true)
        .eq("validation_status", "approved")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[useDbRestaurants] error:", error);
        return [];
      }
      return (data as DbRestaurantRow[]).map(adaptDbToRestaurant);
    },
    staleTime: 60_000,
  });
}
