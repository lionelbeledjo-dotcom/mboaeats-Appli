import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Star, Clock, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listFavorites } from "@/server/social.functions";
import { SmartBack } from "@/components/SmartBack";
import { FavoriteButton } from "@/components/FavoriteButton";
import { EmptyState, RowSkeleton } from "@/components/ui/feedback";

export const Route = createFileRoute("/favoris")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/connexion", search: { next: "/favoris" } });
  },
  head: () => ({
    meta: [
      { title: "Mes favoris · MboaEats" },
      { name: "description", content: "Vos restaurants sauvegardés." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavorisPage,
});

type FavRow = {
  restaurant_id: string;
  restaurants: {
    id: string;
    slug: string;
    name: string;
    cuisine: string;
    city: string;
    image_url: string | null;
    rating: number | null;
    eta_min: number | null;
    eta_max: number | null;
    delivery_fee: number | null;
  } | null;
};

function FavorisPage() {
  const fetchFn = useServerFn(listFavorites);
  const [rows, setRows] = useState<FavRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchFn()
      .then((r) => { if (alive) setRows((r.favorites ?? []) as FavRow[]); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [fetchFn]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <SmartBack backTo="/profil" />
          <h1 className="font-display text-lg font-bold">Mes favoris</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        {rows === null ? (
          <ul className="space-y-3">{[0, 1, 2].map((i) => <li key={i}><RowSkeleton /></li>)}</ul>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Aucun favori pour l'instant"
            description="Ajoutez vos restaurants préférés en appuyant sur le cœur."
            action={{ label: "Découvrir les restos", to: "/decouvrir" }}
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((f) => {
              const r = f.restaurants;
              if (!r) return null;
              return (
                <li key={f.restaurant_id} className="overflow-hidden rounded-2xl border border-border bg-surface/60">
                  <Link to="/r/$slug" params={{ slug: r.slug }} className="flex gap-3 p-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {r.image_url && <img src={r.image_url} alt={r.name} className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.cuisine} · {r.city}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(r.rating ?? 4.5).toFixed(1)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{r.eta_min ?? 20}-{r.eta_max ?? 40} min</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{(r.delivery_fee ?? 0).toLocaleString("fr-FR")} F</span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex justify-end px-3 pb-3">
                    <FavoriteButton
                      restaurantId={r.id}
                      className="flex h-9 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-semibold"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
