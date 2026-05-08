import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Star, Clock, MapPin, Flame, Plus, Search, Heart } from "lucide-react";
import { toast } from "sonner";
import { SmartBack } from "@/components/SmartBack";
import { RestaurantSkeleton } from "@/components/Skeleton";
import { getRestaurant, type Restaurant } from "@/data/restaurants";
import { addToCart, useCart, setQty as setCartQty } from "@/hooks/use-cart";
import { QuantityStepper } from "@/components/QuantityStepper";

export const Route = createFileRoute("/restaurants/$restoId")({
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
      { title: `${loaderData?.restaurant.name ?? "Restaurant"} — MboaEats` },
      {
        name: "description",
        content: loaderData?.restaurant.tagline ?? "Menu du restaurant",
      },
    ],
  }),
  component: RestaurantPage,
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Restaurant introuvable.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">
        Retour à l'accueil
      </Link>
    </div>
  ),
});

function RestaurantPage() {
  const { restaurant } = Route.useLoaderData() as { restaurant: Restaurant };
  const navigate = useNavigate();
  const { items: cartItems } = useCart();
  const qtyOf = (dishId: string) => cartItems.find((i) => i.id === `${dishId}__default`)?.qty ?? 0;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Banner */}
      <div className="relative h-64 w-full overflow-hidden md:h-80">
        <img
          src={restaurant.cover}
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />

        {/* Top bar: SmartBack + favorite */}
        <div className="absolute inset-x-0 top-0 flex items-start gap-3 p-4 pt-5">
          <div className="flex-1">
            <SmartBack
              backTo="/"
              crumbs={[
                { label: "Accueil", to: "/" },
                { label: restaurant.name },
              ]}
            />
          </div>
          <button
            aria-label="Favori"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-xl transition hover:bg-black/60 active:scale-95"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="container mx-auto -mt-14 max-w-3xl px-4 pb-12">
        {/* Restaurant identity card */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-glow animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold leading-tight">{restaurant.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{restaurant.tagline}</p>
            </div>
            <span className="shrink-0 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              ● Ouvert
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1 font-semibold">
              <Star className="h-4 w-4 fill-gold text-gold" />
              <span>{restaurant.rating}</span>
              <span className="text-muted-foreground">(2.4k)</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {restaurant.eta}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {restaurant.city}
            </span>
          </div>
        </div>

        {/* Sticky search + category tabs */}
        <div className="sticky top-2 z-30 mt-6">
          <div className="rounded-2xl border border-border/60 bg-background/85 p-2 shadow-card backdrop-blur-xl">
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Rechercher dans le menu..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {restaurant.categories.map((cat, i) => (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    i === 0
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Menu categories */}
        <div className="mt-8 space-y-10">
          {restaurant.categories.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-xl font-bold">{cat.label}</h2>
                <span className="text-xs text-muted-foreground">{cat.dishes.length} plats</span>
              </div>
              <ul className="space-y-3">
                {cat.dishes.map((dish, i) => (
                  <li
                    key={dish.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Link
                      to="/restaurants/$restoId/plats/$platId"
                      params={{ restoId: restaurant.id, platId: dish.id }}
                      preload="intent"
                      className="group flex items-stretch gap-4 rounded-2xl border border-border/50 bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
                    >
                      {/* Text left */}
                      <div className="flex min-w-0 flex-1 flex-col py-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-display font-bold">{dish.name}</h3>
                          {dish.popular && (
                            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                              ★ Top
                            </span>
                          )}
                          {dish.spicy && (
                            <Flame className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {dish.description}
                        </p>
                        <div className="mt-auto pt-2">
                          <span className="font-display text-base font-bold text-primary">
                            {dish.price.toLocaleString("fr-FR")}
                            <span className="ml-1 text-xs font-semibold text-primary/80">FCFA</span>
                          </span>
                        </div>
                      </div>

                      {/* Photo right with floating + button */}
                      <div className="relative shrink-0">
                        <img
                          src={dish.image}
                          alt={dish.name}
                          loading="lazy"
                          width={112}
                          height={112}
                          className="h-28 w-28 rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <button
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
                          className={`absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-110 active:scale-95 ${qtyOf(dish.id) > 0 ? "hidden" : ""}`}
                        >
                          <Plus className="h-5 w-5" strokeWidth={2.6} />
                        </button>
                        {qtyOf(dish.id) > 0 && (
                          <div className="absolute -bottom-3 -right-2">
                            <QuantityStepper
                              size="sm"
                              qty={qtyOf(dish.id)}
                              onInc={() => setCartQty(`${dish.id}__default`, qtyOf(dish.id) + 1)}
                              onDec={() => setCartQty(`${dish.id}__default`, qtyOf(dish.id) - 1)}
                              ariaLabel={`Quantité de ${dish.name}`}
                            />
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
