import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Flame, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SmartImage } from "@/components/SmartImage";
import { RestaurantSkeleton } from "@/components/Skeleton";
import { QuantityStepper } from "@/components/QuantityStepper";
import { getRestaurant, type Restaurant } from "@/data/restaurants";
import { addToCart, useCart, setQty as setCartQty } from "@/hooks/use-cart";
import { dishAllergens } from "@/lib/restaurant-meta";

export const Route = createFileRoute("/restaurants/$restoId/menu")({
  loader: ({ params }) => {
    const r = getRestaurant(params.restoId);
    if (!r) throw notFound();
    return { restaurant: r };
  },
  staleTime: Infinity,
  pendingMs: 100,
  pendingComponent: RestaurantSkeleton,
  head: ({ loaderData }) => ({
    meta: [
      { title: `Menu — ${loaderData?.restaurant.name ?? "Restaurant"} | MboaEats` },
      {
        name: "description",
        content: `Découvrez le menu complet de ${loaderData?.restaurant.name ?? "ce restaurant"}.`,
      },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: MenuPage,
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Restaurant introuvable.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">
        Retour à l'accueil
      </Link>
    </div>
  ),
});

function MenuPage() {
  const { restaurant } = Route.useLoaderData() as { restaurant: Restaurant };
  const navigate = useNavigate();
  const { items: cartItems } = useCart();
  const qtyOf = (dishId: string) => cartItems.find((i) => i.id === `${dishId}__default`)?.qty ?? 0;

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(restaurant.categories[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurant.categories
      .map((cat) => ({
        ...cat,
        dishes: q
          ? cat.dishes.filter(
              (d) =>
                d.name.toLowerCase().includes(q) ||
                d.description.toLowerCase().includes(q),
            )
          : cat.dishes,
      }))
      .filter((cat) => cat.dishes.length > 0);
  }, [restaurant.categories, query]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header sticky compact */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/restaurants/$restoId", params: { restoId: restaurant.id } })
            }
            aria-label="Retour"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-foreground transition active:scale-95 hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5 rotate-180" strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Menu
            </p>
            <h1 className="truncate font-display text-base font-extrabold leading-tight sm:text-lg">
              {restaurant.name}
            </h1>
          </div>
        </div>

        {/* Search + chips */}
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un plat..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div
            className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {restaurant.categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                onClick={() => setActiveCat(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  activeCat === cat.id
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Aucun plat ne correspond à « {query} ».
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map((cat) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-xl font-bold">{cat.label}</h2>
                  <span className="text-xs text-muted-foreground">
                    {cat.dishes.length} plat{cat.dishes.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="space-y-3">
                  {cat.dishes.map((dish, i) => (
                    <li
                      key={dish.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <Link
                        to="/restaurants/$restoId/plats/$platId"
                        params={{ restoId: restaurant.id, platId: dish.id }}
                        preload="intent"
                        aria-label={`Voir les détails de ${dish.name}`}
                        className="group relative z-10 flex items-stretch gap-3 overflow-hidden rounded-2xl border border-border/50 bg-card p-3 transition-all cursor-pointer select-none hover:border-[#06C167]/60 hover:shadow-[0_10px_28px_-12px_rgba(6,193,103,0.45)] active:bg-muted/40"
                      >
                        <div className="flex min-w-0 flex-1 flex-col py-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-display text-base font-extrabold text-foreground transition-colors group-hover:text-[#06C167] dark:text-white">
                              {dish.name}
                            </h3>
                            {dish.popular && (
                              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                                ★ Top
                              </span>
                            )}
                            {dish.spicy && <Flame className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {dish.description}
                          </p>
                          {dishAllergens(dish.id).length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {dishAllergens(dish.id).map((a) => (
                                <span
                                  key={a}
                                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                  style={{ backgroundColor: "#FFF4E0", color: "#92580E" }}
                                >
                                  ⚠ {a}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className="price mt-2 text-[#06C167]">
                            {dish.price.toLocaleString("fr-FR")}
                            <span className="price-currency text-[#06C167]">FCFA</span>
                          </span>
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-[#06C167]/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#06C167] transition-all group-hover:bg-[#06C167]/15">
                              Voir <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                            </span>
                            {qtyOf(dish.id) > 0 ? (
                              <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <QuantityStepper
                                  size="sm"
                                  qty={qtyOf(dish.id)}
                                  onInc={() => setCartQty(`${dish.id}__default`, qtyOf(dish.id) + 1)}
                                  onDec={() => setCartQty(`${dish.id}__default`, qtyOf(dish.id) - 1)}
                                  ariaLabel={`Quantité de ${dish.name}`}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                aria-label={`Ajouter ${dish.name} au panier`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addToCart({
                                    id: `${dish.id}__default`,
                                    dishId: dish.id,
                                    restoId: restaurant.id,
                                    name: dish.name,
                                    price: dish.price,
                                    qty: 1,
                                    image: dish.image,
                                  });
                                  toast.success("L'article a été ajouté au panier !", {
                                    description: `1 × ${dish.name}`,
                                    action: {
                                      label: "Voir le panier",
                                      onClick: () => navigate({ to: "/checkout" }),
                                    },
                                  });
                                }}
                                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#06C167] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#05a558] hover:shadow-md active:scale-95"
                              >
                                Ajouter <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          className="relative shrink-0 self-start h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl bg-muted"
                          style={{ contain: "layout paint" }}
                        >
                          <SmartImage
                            src={dish.image}
                            alt={dish.name}
                            ratio="1 / 1"
                            width={96}
                            height={96}
                            wrapperClassName="!h-full !w-full"
                            className="pointer-events-none"
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
