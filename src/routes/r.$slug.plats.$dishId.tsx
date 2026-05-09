import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Flame, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { DishSkeleton } from "@/components/Skeleton";
import { getDishBySlugAndId } from "@/server/marketplace.functions";
import { addToCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/r/$slug/plats/$dishId")({
  component: DbDishPage,
  head: ({ params }) => ({
    meta: [
      { title: `Plat · ${params.slug} · MboaEats` },
      { name: "description", content: "Détails du plat" },
    ],
  }),
});

type Resto = {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  city: string;
  neighborhood: string | null;
  image_url: string | null;
  cover_url: string | null;
  rating: number | null;
  is_open: boolean | null;
};
type Dish = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  allergens: string[] | null;
  is_popular: boolean | null;
  is_available: boolean | null;
};

function DbDishPage() {
  const { slug, dishId } = Route.useParams();
  const navigate = useNavigate();
  const fetcher = useServerFn(getDishBySlugAndId);

  const [resto, setResto] = useState<Resto | null>(null);
  const [dish, setDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetcher({ data: { slug, dishId } })
      .then((r) => {
        setResto(r.resto as Resto | null);
        setDish(r.dish as Dish | null);
      })
      .finally(() => setLoading(false));
  }, [fetcher, slug, dishId]);

  if (loading) {
    return <DishSkeleton />;
  }
  if (!resto || !dish) {
    return (
      <div className="bg-background p-10 text-center text-muted-foreground">
        Plat introuvable.{" "}
        <Link to="/r/$slug" params={{ slug }} className="text-[#06C167] underline">
          Retour au menu
        </Link>
      </div>
    );
  }

  const total = dish.price * qty;
  const canOrder = !!resto.is_open && !!dish.is_available;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Cover */}
      <div className="relative h-72 w-full overflow-hidden bg-muted md:h-96">
        {dish.image_url ? (
          <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background">
            <Flame className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-4 pt-5">
          <Link
            to="/r/$slug"
            params={{ slug }}
            aria-label="Retour au restaurant"
            className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-black shadow-md backdrop-blur hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
            <span>Retour au restaurant</span>
          </Link>
        </div>
      </div>

      <div className="container mx-auto -mt-10 max-w-2xl px-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-glow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to="/r/$slug"
                params={{ slug }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {resto.name} · {resto.city}
              </Link>
              <h1 className="mt-1 text-2xl font-extrabold text-foreground dark:text-white">
                {dish.name}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(resto.rating ?? 4.5).toFixed(1)}
                </span>
                {dish.is_popular && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    ★ Top
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#06C167]/15 px-3 py-1 text-sm font-bold text-[#06C167]">
              {dish.price.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          {dish.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {dish.description}
            </p>
          )}
        </div>

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Allergènes
            </h2>
            <div className="flex flex-wrap gap-2">
              {dish.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-semibold text-foreground"
                >
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Quantity */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3">
          <span className="text-sm font-semibold text-foreground">Quantité</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60"
              aria-label="Diminuer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-bold text-foreground">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#06C167] text-white shadow-[0_8px_20px_-6px_rgba(6,193,103,0.7)] transition-transform hover:scale-105 active:scale-95"
              aria-label="Augmenter"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
            </button>
          </div>
        </div>

        {!canOrder && (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {resto.is_open ? "Plat indisponible pour le moment" : "Restaurant fermé"}
          </p>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-24 z-40 px-4 md:bottom-6">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={!canOrder}
            onClick={() => {
              addToCart({
                id: `db__${dish.id}`,
                dishId: dish.id,
                restoId: resto.id,
                name: dish.name,
                price: dish.price,
                qty,
                image: dish.image_url ?? undefined,
              });
              toast.success("L'article a été ajouté au panier !", {
                description: `${qty} × ${dish.name}`,
                action: {
                  label: "Voir le panier",
                  onClick: () => navigate({ to: "/checkout" }),
                },
              });
            }}
            className="flex w-full items-center justify-between rounded-full bg-[#06C167] px-6 py-4 text-sm font-bold text-white shadow-[0_12px_32px_-10px_rgba(6,193,103,0.7)] transition active:scale-[0.98] disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ajouter au panier
            </span>
            <span>{total.toLocaleString("fr-FR")} FCFA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
