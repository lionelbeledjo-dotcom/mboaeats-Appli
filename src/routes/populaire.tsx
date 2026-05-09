import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Star, Clock, Plus } from "lucide-react";
import { restaurants, type Dish, type Restaurant } from "@/data/restaurants";

export const Route = createFileRoute("/populaire")({
  component: PopulairePage,
  staleTime: Infinity,
  head: () => ({
    meta: [
      { title: "Populaire — MboaEats" },
      { name: "description", content: "Les plats les plus populaires sur MboaEats." },
    ],
  }),
});

type Match = { restaurant: Restaurant; dish: Dish };

function getPopular(): Match[] {
  const out: Match[] = [];
  for (const r of restaurants) {
    for (const c of r.categories) {
      for (const d of c.dishes) {
        if (d.popular) out.push({ restaurant: r, dish: d });
      }
    }
  }
  return out.sort((a, b) => b.restaurant.rating - a.restaurant.rating);
}

function PopulairePage() {
  const router = useRouter();
  const matches = getPopular();

  const handleBack = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={handleBack}
            aria-label="Retour"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">🔥</span>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-tight truncate">Populaire</h1>
              <p className="text-[11px] text-muted-foreground">{matches.length} plats favoris</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-12 pt-4 grid gap-3">
        {matches.map(({ restaurant, dish }) => (
          <Link
            key={`${restaurant.id}-${dish.id}`}
            to="/restaurants/$restoId/plats/$platId"
            params={{ restoId: restaurant.id, platId: dish.id }}
            preload="intent"
            className="flex gap-3 rounded-2xl border border-border bg-card p-3 active:scale-[0.99] transition-transform shadow-card"
          >
            <img
              src={dish.image}
              alt={dish.name}
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div className="min-w-0">
                <h2 className="truncate font-display text-sm font-bold">{dish.name}</h2>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{dish.description}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold">{restaurant.name}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    {restaurant.rating}
                    <Clock className="ml-1 h-2.5 w-2.5" />
                    {restaurant.eta}
                  </span>
                </div>
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-cm-green px-2.5 py-1 text-[11px] font-bold text-brand-cm-green-fg">
                  <Plus className="h-3 w-3" />
                  {dish.price.toLocaleString("fr-FR")}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
