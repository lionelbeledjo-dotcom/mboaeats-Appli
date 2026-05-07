import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Star, Clock, MapPin, Plus, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getRestaurantBySlug } from "@/server/marketplace.functions";
import { addToCart, useCart } from "@/hooks/use-cart";
import { FavoriteButton } from "@/components/FavoriteButton";

export const Route = createFileRoute("/r/$slug")({
  component: RestoLivePage,
  head: ({ params }) => ({
    meta: [
      { title: `Restaurant ${params.slug} · MboaEats` },
      { name: "description", content: "Menu en temps réel" },
    ],
  }),
});

type Resto = {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  city: string;
  neighborhood: string | null;
  image_url: string | null;
  cover_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  eta_min: number | null;
  eta_max: number | null;
  delivery_fee: number | null;
  min_order: number | null;
  is_open: boolean | null;
};
type Cat = { id: string; name: string; sort_order: number | null };
type Dish = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_popular: boolean | null;
  is_available: boolean | null;
};

function RestoLivePage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const fetcher = useServerFn(getRestaurantBySlug);
  const { items, count, subtotal } = useCart();

  const [resto, setResto] = useState<Resto | null>(null);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetcher({ data: { slug } })
      .then((r) => {
        setResto(r.resto as Resto | null);
        setCategories((r.categories ?? []) as Cat[]);
        setDishes((r.dishes ?? []) as Dish[]);
      })
      .finally(() => setLoading(false));
  }, [fetcher, slug]);

  const grouped = useMemo(() => {
    const map = new Map<string, Dish[]>();
    for (const d of dishes) {
      const key = d.category_id ?? "_";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [dishes]);

  // Le panier vit côté local et accepte les deux origines (mock + DB).
  const restoCartItems = items.filter((i) => i.restoId === resto?.id);
  const restoSubtotal = restoCartItems.reduce((s, i) => s + i.qty * i.price, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!resto) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Restaurant introuvable.{" "}
        <Link to="/decouvrir" className="text-primary underline">
          Retour
        </Link>
      </div>
    );
  }

  const cover = resto.cover_url ?? resto.image_url ?? "";

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        {cover ? (
          <img src={cover} alt={resto.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-accent/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-background" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <Link
            to="/decouvrir"
            className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Link>
          <FavoriteButton restaurantId={resto.id} />
        </div>
      </div>

      <main className="mx-auto -mt-12 max-w-3xl px-4">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-glow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold">{resto.name}</h1>
              <p className="text-sm text-muted-foreground">{resto.cuisine}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                resto.is_open
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {resto.is_open ? "● Ouvert" : "Fermé"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1 font-semibold">
              <Star className="h-4 w-4 fill-gold text-gold" />
              {Number(resto.rating ?? 4.5).toFixed(1)}
              <span className="text-muted-foreground">
                ({resto.reviews_count ?? 0})
              </span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {resto.eta_min ?? 20}-
              {resto.eta_max ?? 40} min
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {resto.neighborhood ?? resto.city}
            </span>
            <span className="text-muted-foreground">
              Livraison {(resto.delivery_fee ?? 0).toLocaleString("fr-FR")} F
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-10">
          {categories.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Menu en cours de mise en ligne.
            </p>
          )}
          {categories.map((cat) => {
            const list = grouped.get(cat.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={cat.id}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-xl font-bold">{cat.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {list.length} plats
                  </span>
                </div>
                <ul className="space-y-3">
                  {list.map((dish) => (
                    <li
                      key={dish.id}
                      className="flex items-stretch gap-4 rounded-2xl border border-border bg-card p-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col py-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-display font-bold">
                            {dish.name}
                          </h3>
                          {dish.is_popular && (
                            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                              ★ Top
                            </span>
                          )}
                        </div>
                        {dish.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {dish.description}
                          </p>
                        )}
                        <div className="mt-auto pt-2">
                          <span className="font-display text-base font-bold text-primary">
                            {dish.price.toLocaleString("fr-FR")}
                            <span className="ml-1 text-xs">FCFA</span>
                          </span>
                        </div>
                      </div>
                      <div className="relative shrink-0">
                        {dish.image_url ? (
                          <img
                            src={dish.image_url}
                            alt={dish.name}
                            loading="lazy"
                            className="h-24 w-24 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10">
                            <Flame className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <button
                          aria-label={`Ajouter ${dish.name}`}
                          disabled={!resto.is_open || !dish.is_available}
                          onClick={() => {
                            addToCart({
                              id: `db__${dish.id}`,
                              dishId: dish.id,
                              restoId: resto.id,
                              name: dish.name,
                              price: dish.price,
                              qty: 1,
                              image: dish.image_url ?? undefined,
                            });
                            toast.success("Ajouté au panier", {
                              description: `1 × ${dish.name}`,
                              action: {
                                label: "Voir le panier",
                                onClick: () => navigate({ to: "/checkout" }),
                              },
                            });
                          }}
                          className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-110 active:scale-95 disabled:opacity-40"
                        >
                          <Plus className="h-5 w-5" strokeWidth={2.6} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      {restoCartItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {count} article{count > 1 ? "s" : ""} · Sous-total
              </p>
              <p className="font-display text-lg font-bold">
                {subtotal.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/checkout" })}
              className="rounded-2xl bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow"
            >
              Commander
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
