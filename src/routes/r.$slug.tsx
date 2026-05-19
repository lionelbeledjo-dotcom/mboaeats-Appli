import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Star, Clock, MapPin, Plus, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getRestaurantPageData as getRestaurantBySlug } from "@/server/catalog.fast.functions";
import { addToCart, useCart, clearCart } from "@/hooks/use-cart";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToCartFab } from "@/components/AddToCartFab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-by-slug", slug],
    queryFn: () => fetcher({ data: { slug } }),
    staleTime: 2 * 60 * 1000, // 2 min — menu live
    gcTime: 30 * 60 * 1000,
  });

  const resto = (data?.resto ?? null) as Resto | null;
  const categories = useMemo(() => (data?.categories ?? []) as Cat[], [data]);
  const dishes = useMemo(() => (data?.dishes ?? []) as unknown as Dish[], [data]);
  const loading = isLoading && !data;

  const [activeCat, setActiveCat] = useState<string | null>(null);
  useEffect(() => {
    if (!activeCat && categories[0]) setActiveCat(categories[0].id);
  }, [categories, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<string, Dish[]>();
    for (const d of dishes) {
      const key = d.category_id ?? "_";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [dishes]);

  const restoCartItems = items.filter((i) => i.restoId === resto?.id);
  const restoSubtotal = restoCartItems.reduce((s, i) => s + i.qty * i.price, 0);
  const restoCount = restoCartItems.reduce((s, i) => s + i.qty, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
    );
  }
  if (!resto) {
    return (
      <div className="bg-white p-10 text-center text-neutral-600">
        Restaurant introuvable.{" "}
        <Link to="/decouvrir" className="text-black underline">
          Retour
        </Link>
      </div>
    );
  }

  const cover = resto.cover_url ?? resto.image_url ?? "";

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Hero cover — bloc isolé, jamais par-dessus le titre */}
      <div className="relative h-44 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 sm:h-56 md:h-72">
        {cover ? (
          <img
            src={cover}
            alt={resto.name}
            loading="eager"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <Link
            to="/decouvrir"
            aria-label="Retour"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-black shadow-md backdrop-blur"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <FavoriteButton restaurantId={resto.id} />
        </div>
      </div>

      {/* Resto info card */}
      <main className="mx-auto mt-6 max-w-3xl px-4 sm:mt-8">
        <div
          className="rounded-[1.5rem] border border-neutral-200 bg-card p-5 dark:border-neutral-800"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {resto.name}
              </h1>
              <p className="mt-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {resto.cuisine}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                resto.is_open
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {resto.is_open ? "● Ouvert" : "Fermé"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-700 dark:text-neutral-300">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={2} />
              {Number(resto.rating ?? 4.5).toFixed(1)}
              <span className="font-normal text-neutral-500 dark:text-neutral-400">
                ({resto.reviews_count ?? 0})
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} /> {resto.eta_min ?? 20}–{resto.eta_max ?? 40} min
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2} /> {resto.neighborhood ?? resto.city}
            </span>
            <span>
              Livraison {(resto.delivery_fee ?? 0).toLocaleString("fr-FR")} F
            </span>
          </div>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-2">
              {categories.map((cat) => {
                const active = activeCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCat(cat.id);
                      const el = document.getElementById(`cat-${cat.id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-neutral-300 bg-card text-foreground hover:border-foreground/60 dark:border-neutral-700"
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dishes */}
        <div className="mt-6 space-y-8">
          {categories.length === 0 && (
            <p className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
              Menu en cours de mise en ligne.
            </p>
          )}
          {categories.map((cat) => {
            const list = grouped.get(cat.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
                <h2 className="mb-3 text-lg font-extrabold tracking-tight text-foreground">{cat.name}</h2>
                <ul className="space-y-3">
                  {list.map((dish) => (
                    <DishCard
                      key={dish.id}
                      slug={slug}
                      dish={dish}
                      restoOpen={!!resto.is_open}
                      onAdd={() => {
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
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      {/* Floating Add-to-cart FAB (uses items for THIS restaurant) */}
      <AddToCartFab count={restoCount || count} total={restoSubtotal || subtotal} restoId={resto.id} />
    </div>
  );
}

function DishCard({
  slug,
  dish,
  restoOpen,
  onAdd,
}: {
  slug: string;
  dish: Dish;
  restoOpen: boolean;
  onAdd: () => void;
}) {
  const cheap = dish.price > 0 && dish.price < 2000;
  return (
    <li>
      <Link
        to="/r/$slug/plats/$dishId"
        params={{ slug, dishId: dish.id }}
        preload="intent"
        aria-label={`Voir les détails de ${dish.name}`}
        className="group relative z-10 flex items-stretch gap-3 overflow-hidden rounded-[1.25rem] border border-neutral-200 bg-card p-3 transition-all cursor-pointer select-none hover:-translate-y-0.5 hover:border-[#06C167]/60 hover:shadow-[0_10px_28px_-12px_rgba(6,193,103,0.45)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-neutral-800"
        style={{ boxShadow: "var(--shadow-soft)", contain: "layout paint" }}
      >
        <div className="pointer-events-none relative shrink-0 h-20 w-20 sm:h-24 sm:w-24">
          {dish.image_url ? (
            <img
              src={dish.image_url}
              alt={dish.name}
              loading="lazy"
              className="pointer-events-none h-full w-full rounded-[1rem] object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[1rem] bg-neutral-100 dark:bg-neutral-800">
              <Flame className="h-6 w-6 text-neutral-400" />
            </div>
          )}
          {dish.is_popular && (
            <span className="absolute -left-1 -top-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
              Top
            </span>
          )}
          {!dish.is_popular && cheap && (
            <span className="absolute -left-1 -top-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground ring-1 ring-neutral-300 dark:ring-neutral-700">
              -2000F
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-1">
          <h3 className="truncate text-base font-extrabold tracking-tight text-foreground group-hover:text-[#06C167] transition-colors dark:text-white">
            {dish.name}
          </h3>
          {dish.description && (
            <p className="mt-0.5 line-clamp-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {dish.description}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2">
            <div className="flex items-baseline gap-2">
              <span className="price text-[#06C167]">
                {dish.price.toLocaleString("fr-FR")}
                <span className="price-currency text-[#06C167]">FCFA</span>
              </span>
            </div>
            <button
              type="button"
              aria-label={`Ajouter ${dish.name}`}
              disabled={!restoOpen || !dish.is_available}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#06C167] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#05a558] hover:shadow-md active:scale-95 disabled:opacity-40"
            >
              Ajouter <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
            </button>
          </div>
        </div>
      </Link>
    </li>
  );
}
