import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SmartImage } from "@/components/SmartImage";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Flame, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { DishSkeleton } from "@/components/Skeleton";
import { DishReviews } from "@/components/DishReviews";
import { getDishBySlugAndId } from "@/lib/marketplace.functions";
import { addToCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/r/$slug_/plats/$dishId")({
  component: DbDishPage,
  // Préchargement (hover desktop / focus mobile) déclenché par defaultPreload="intent"
  loader: ({ params }) =>
    getDishBySlugAndId({ data: { slug: params.slug, dishId: params.dishId } }),
  staleTime: 60_000,
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

  const initial = Route.useLoaderData() as { resto: Resto | null; dish: Dish | null };
  const [resto, setResto] = useState<Resto | null>(initial?.resto ?? null);
  const [dish, setDish] = useState<Dish | null>(initial?.dish ?? null);
  const [loading, setLoading] = useState(!initial?.dish);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    // Re-sync when params change (loader data already primes initial render)
    setResto(initial?.resto ?? null);
    setDish(initial?.dish ?? null);
    if (initial?.dish) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetcher({ data: { slug, dishId } })
      .then((r) => {
        setResto(r.resto as Resto | null);
        setDish(r.dish as Dish | null);
      })
      .finally(() => setLoading(false));
  }, [fetcher, slug, dishId, initial]);

  if (loading) {
    return (
      <div className="animate-content-in">
        <DishSkeleton />
      </div>
    );
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
      {/* Cover — hauteur fixe, sans chevauchement avec le contenu */}
      <div
        className="relative w-full overflow-hidden bg-muted animate-content-in"
        style={{ height: "40vh", maxHeight: 420, animationDelay: "0ms" }}
      >
        {dish.image_url ? (
          <SmartImage src={dish.image_url} alt={dish.name} ratio="4 / 3" loading="eager" wrapperClassName="!aspect-auto h-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background">
            <Flame className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-4 pt-5">
          <Link
            to="/r/$slug"
            params={{ slug }}
            aria-label="Retour au restaurant"
            className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-medium text-black shadow-md hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
            <span>Retour au restaurant</span>
          </Link>
        </div>
      </div>

      {/* Bloc texte — démarre proprement EN DESSOUS de l'image, fond propre */}
      <div className="container mx-auto max-w-2xl px-4 pt-6">
        <div
          className="rounded-3xl border border-border/60 bg-card p-5 shadow-card animate-content-in"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to="/r/$slug"
                params={{ slug }}
                className="text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                {resto.name} · {resto.city}
              </Link>
              <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-foreground dark:text-white">
                {dish.name}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(resto.rating ?? 4.5).toFixed(1)}
                </span>
                {dish.is_popular && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    ★ Top
                  </span>
                )}
              </div>
            </div>
            <span className="price shrink-0 rounded-full bg-[#06C167]/15 px-3 py-1 text-[#06C167]">
              {dish.price.toLocaleString("fr-FR")}<span className="price-currency">FCFA</span>
            </span>
          </div>

          {dish.description && (
            <p className="mt-4 text-sm font-normal leading-relaxed text-muted-foreground">
              {dish.description}
            </p>
          )}
        </div>

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <section className="mt-5 animate-content-in" style={{ animationDelay: "0ms" }}>
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

        {/* Instructions spéciales */}
        <section className="mt-5 rounded-2xl border border-border/60 bg-card p-4 animate-content-in">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Instructions spéciales
          </h2>
          <div className="mb-2 flex flex-wrap gap-2">
            {["Sans oignon", "Sans piment", "Extra sauce", "Bien cuit", "Peu salé"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setNote((n) => (n.includes(tag) ? n : (n ? n + ", " : "") + tag))
                }
                className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-foreground transition hover:border-[#06C167]/60 hover:text-[#06C167]"
              >
                + {tag}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Ex : pas d'oignon, sauce à part…"
            className="w-full resize-none rounded-xl border border-border/60 bg-background p-3 text-sm outline-none focus:border-[#06C167]"
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{note.length}/200</p>
        </section>

        {/* Quantity */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3 animate-content-in" style={{ animationDelay: "0ms" }}>
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

        <DishReviews dishId={dish.id} restaurantId={resto.id} />
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-24 z-40 px-4 md:bottom-6 animate-content-in" style={{ animationDelay: "0ms" }}>
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={!canOrder}
            onClick={() => {
              addToCart({
                id: `db__${dish.id}__${(note || "").slice(0, 20)}`,
                dishId: dish.id,
                restoId: resto.id,
                name: dish.name,
                price: dish.price,
                qty,
                image: dish.image_url ?? undefined,
                note: note.trim() || undefined,
              });
              toast.success("L'article a été ajouté au panier !", {
                description: `${qty} × ${dish.name}${note ? ` · ${note.slice(0, 30)}` : ""}`,
                action: {
                  label: "Voir le panier",
                  onClick: () => navigate({ to: "/checkout" }),
                },
              });
            }}
            className="flex w-full items-center justify-between rounded-full bg-[#06C167] px-6 py-4 text-sm font-medium text-white shadow-[0_12px_32px_-10px_rgba(6,193,103,0.7)] transition active:scale-[0.98] disabled:opacity-50"
          >
            <span className="flex items-center gap-2 font-medium">
              <ShoppingCart className="h-4 w-4" strokeWidth={2} />
              Ajouter au panier
            </span>
            <span className="price-cta">{total.toLocaleString("fr-FR")}<span className="price-currency">FCFA</span></span>
          </button>
        </div>
      </div>
    </div>
  );
}
