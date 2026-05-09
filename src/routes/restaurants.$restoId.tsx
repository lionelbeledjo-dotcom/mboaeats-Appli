import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Star, Clock, MapPin, Flame, Plus, Search, Heart, ChevronRight } from "lucide-react";
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
      {/* Banner — décalée pour ne pas être coupée par le SiteHeader sticky */}
      <div className="relative mt-16 h-44 w-full overflow-hidden sm:mt-20 sm:h-64 md:h-80">
        <img
          src={restaurant.cover}
          alt={restaurant.name}
          className="absolute inset-0 z-0 h-full w-full object-cover"
        />
        {/* Overlay top → assure lisibilité du header & boutons */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/20 to-background" />
        {/* Overlay bottom → fond pour le titre */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Top bar: SmartBack + favorite */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-start gap-3 p-4 pt-5">
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur-xl transition hover:bg-black/70 active:scale-95"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>

        {/* Titre overlay (toujours lisible quelle que soit l'image) */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-6 sm:pb-6">
          <h1
            className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl md:text-4xl"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9)" }}
          >
            {restaurant.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-white sm:text-sm"
               style={{ textShadow: "0 1px 6px rgba(0,0,0,0.85)" }}>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-gold text-gold drop-shadow" />
              <span>{restaurant.rating}</span>
              <span className="text-white/80">(2.4k)</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {restaurant.eta}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {restaurant.city}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto -mt-6 max-w-3xl px-4 pb-12 sm:-mt-14">
        {/* Restaurant identity card */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-glow animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{restaurant.tagline}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#06C167]/15 px-3 py-1 text-xs font-semibold text-[#06C167]">
              ● Ouvert
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
