import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Star, Clock, Plus, Mail } from "lucide-react";
import { restaurants, type Dish, type Restaurant } from "@/data/restaurants";

const CATEGORIES: Record<string, { label: string; icon: string; keywords: string[] }> = {
  ndole: { label: "Ndolé", icon: "🥬", keywords: ["ndole", "ndolé"] },
  "poulet-dg": { label: "Poulet DG", icon: "🍗", keywords: ["poulet dg", "poulet"] },
  eru: { label: "Eru", icon: "🍲", keywords: ["eru"] },
  poisson: { label: "Poisson braisé", icon: "🐟", keywords: ["poisson", "bar", "capitaine", "maquereau"] },
  suya: { label: "Suya", icon: "🍢", keywords: ["suya", "soya", "brochette"] },
  beignets: { label: "Beignets", icon: "🥯", keywords: ["beignet", "accras", "macabo"] },
  jus: { label: "Jus naturels", icon: "🥤", keywords: ["jus", "bissap"] },
};

export const Route = createFileRoute("/categorie/$slug")({
  component: CategoryPage,
  staleTime: Infinity,
  head: ({ params }) => {
    const c = CATEGORIES[params.slug];
    const title = c ? `${c.label} — MboaEats` : "Catégorie — MboaEats";
    return {
      meta: [
        { title },
        { name: "description", content: c ? `Tous les restaurants proposant ${c.label} à Douala et Yaoundé.` : "Catégorie MboaEats" },
      ],
    };
  },
});

type Match = { restaurant: Restaurant; dish: Dish };

function findDishes(slug: string): Match[] {
  const cat = CATEGORIES[slug];
  if (!cat) return [];
  const out: Match[] = [];
  for (const r of restaurants) {
    for (const c of r.categories) {
      for (const d of c.dishes) {
        const haystack = `${d.name} ${d.description}`.toLowerCase();
        if (cat.keywords.some((k) => haystack.includes(k))) {
          out.push({ restaurant: r, dish: d });
        }
      }
    }
  }
  return out;
}

function CategoryPage() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const cat = CATEGORIES[slug];
  const matches = findDishes(slug);

  if (!cat) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Catégorie introuvable.</p>
        <Link to="/" className="mt-4 text-primary font-semibold">Retour à l'accueil</Link>
      </div>
    );
  }

  const handleBack = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={handleBack}
            aria-label="Retour"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{cat.icon}</span>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">{cat.label}</h1>
              <p className="text-[11px] text-muted-foreground">{matches.length} plat{matches.length > 1 ? "s" : ""} disponible{matches.length > 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-8 pt-4">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/60 p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucun plat trouvé pour cette catégorie pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {matches.map(({ restaurant, dish }, i) => (
              <Link
                key={`${restaurant.id}-${dish.id}`}
                to="/restaurants/$restoId/plats/$platId"
                params={{ restoId: restaurant.id, platId: dish.id }}
                preload="intent"
                className="group flex gap-3 overflow-hidden rounded-2xl border border-border bg-card shadow-card active:scale-[0.99] transition-transform"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="relative h-28 w-28 shrink-0 overflow-hidden">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    width={224}
                    height={224}
                    loading={i < 3 ? "eager" : "lazy"}
                    className="h-full w-full object-cover"
                  />
                  {dish.popular && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-gold/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-background">
                      Top
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <h3 className="font-display text-sm font-semibold leading-tight line-clamp-1">{dish.name}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{dish.description}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-foreground">{restaurant.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-gold text-gold" />
                          {restaurant.rating}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {restaurant.eta}
                        </span>
                        <span>· {restaurant.city}</span>
                      </div>
                    </div>
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-glow">
                      <Plus className="h-3 w-3" />
                      {dish.price.toLocaleString("fr-FR")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <footer className="mt-8 rounded-2xl border border-border/60 bg-surface/40 p-4 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Support MboaEats</p>
          <a
            href="mailto:lionelbrown2728@yahoo.fr"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Mail className="h-3.5 w-3.5" />
            lionelbrown2728@yahoo.fr
          </a>
        </footer>
      </main>
    </div>
  );
}
