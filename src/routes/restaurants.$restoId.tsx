import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { Star, Clock, MapPin, Flame, Plus, Search, Heart, ChevronRight, Bike } from "lucide-react";
import { toast } from "sonner";
import { SmartImage } from "@/components/SmartImage";

import { RestaurantSkeleton } from "@/components/Skeleton";
import { RestaurantReviews } from "@/components/RestaurantReviews";
import { getRestaurant, type Restaurant } from "@/data/restaurants";
import { addToCart, useCart, setQty as setCartQty } from "@/hooks/use-cart";
import { QuantityStepper } from "@/components/QuantityStepper";
import {
  badgeMeta,
  catalogBadge,
  deliveryFee,
  dishAllergens,
  hasPromo,
  isOpenNow,
  openingHours,
  promoLabel,
  reviewCount,
  DAY_LABEL,
  type DayKey,
} from "@/lib/restaurant-meta";

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

  const badge = badgeMeta(catalogBadge(restaurant));
  const fee = deliveryFee(restaurant);
  const open = isOpenNow(restaurant);
  const hours = openingHours(restaurant);
  const promo = hasPromo(restaurant) ? promoLabel(restaurant) : null;
  const reviews = reviewCount(restaurant);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — conteneur fixe 260px, image cover/center, jamais coupée */}
      <div
        className="relative mt-16 sm:mt-20"
        style={{ position: "relative", overflow: "hidden", width: "100%", height: 260 }}
      >
        <SmartImage
          src={restaurant.cover}
          alt={restaurant.name}
          ratio="16 / 7"
          width={1200}
          height={520}
          loading="eager"
          wrapperClassName="!aspect-auto absolute inset-0 !h-full"
          className="object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-black/10 to-transparent" />

        {/* Bouton retour rond */}
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          aria-label="Retour"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 10,
            background: "rgba(0,0,0,0.5)",
            borderRadius: "50%",
            width: 40,
            height: 40,
          }}
          className="flex items-center justify-center text-white backdrop-blur-md transition active:scale-95 hover:bg-black/70"
        >
          <ChevronRight className="h-5 w-5 rotate-180" strokeWidth={2.4} />
        </button>

        <button
          aria-label="Favori"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            background: "rgba(0,0,0,0.5)",
            borderRadius: "50%",
            width: 40,
            height: 40,
          }}
          className="flex items-center justify-center text-white backdrop-blur-md transition active:scale-95 hover:bg-black/70"
        >
          <Heart className="h-5 w-5" />
        </button>

        {badge && (
          <span
            style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10, backgroundColor: badge.bg, color: badge.fg }}
            className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow-md"
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Carte infos qui remonte sur l'image */}
      <div
        className="animate-fade-up"
        style={{
          margin: "-20px 16px 0",
          borderRadius: 20,
          background: "white",
          padding: 20,
          position: "relative",
          zIndex: 5,
          boxShadow: "0 10px 28px -16px rgba(0,0,0,0.18)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold leading-tight text-foreground">
              {restaurant.name}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{restaurant.tagline}</p>
            <div className="mt-3 flex max-w-full flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-foreground/80">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-gold text-gold" />
                <span>{restaurant.rating}</span>
                <span className="text-muted-foreground">({reviews.toLocaleString("fr-FR")})</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {restaurant.eta}
              </span>
              <span className="flex items-center gap-1">
                <Bike className="h-3.5 w-3.5" /> {fee.toLocaleString("fr-FR")} FCFA
              </span>
              <span className="flex min-w-0 items-center gap-1 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{restaurant.neighborhood}, {restaurant.city}</span>
              </span>
            </div>
            {promo && (
              <span
                className="mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold"
                style={{ backgroundColor: "#FFEBEE", color: "#D32F2F" }}
              >
                🎁 {promo}
              </span>
            )}
          </div>
          <span
            className="max-w-[7.5rem] shrink-0 truncate rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: open ? "rgba(6,193,103,0.15)" : "#F5F0E8",
              color: open ? "#06C167" : "#6B6B6B",
            }}
          >
            {open ? "● Ouvert" : "● Fermé"}
          </span>
        </div>

        <details className="group mt-4">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-foreground/80">
            <span>Horaires d'ouverture</span>
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {(["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as DayKey[]).map((d) => (
              <div key={d} className="flex justify-between">
                <span>{DAY_LABEL[d]}</span>
                <span className="font-medium text-foreground/80">{hours[d]}</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Barre de recherche — width: calc(100% - 32px), margin: 0 16px */}
      <div
        className="sticky z-30"
        style={{ top: 8, width: "calc(100% - 32px)", margin: "24px 16px 0" }}
      >
        <div className="rounded-2xl border border-border/60 bg-background/90 p-2 shadow-card backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Rechercher dans le menu..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Chips catégories */}
          <div
            className="mt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              display: "flex",
              overflowX: "auto",
              gap: 8,
              padding: "0 4px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {restaurant.categories.map((cat, i) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                style={{ flexShrink: 0 }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
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

      <div className="container mx-auto max-w-3xl px-4 pb-24 pt-6">

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
                      aria-label={`Voir les détails de ${dish.name}`}
                      className="group relative z-10 grid min-h-32 grid-cols-[minmax(0,1fr)_7rem] gap-3 overflow-hidden rounded-2xl border border-border/50 bg-card p-3 transition-all cursor-pointer select-none hover:border-[#06C167]/60 hover:shadow-[0_10px_28px_-12px_rgba(6,193,103,0.45)] active:bg-muted/40 active:border-[#06C167] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {/* Text left */}
                      <div className="flex min-w-0 flex-1 flex-col py-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-display text-base font-extrabold text-foreground group-hover:text-[#06C167] transition-colors dark:text-white">{dish.name}</h3>
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
                        {dishAllergens(dish.id).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {dishAllergens(dish.id).map((a) => (
                              <span
                                key={a}
                                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                style={{ backgroundColor: "#FFF4E0", color: "#92580E" }}
                                title={`Contient : ${a}`}
                              >
                                ⚠ {a}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                          <span className="price text-[#06C167]">
                            {dish.price.toLocaleString("fr-FR")}
                            <span className="price-currency text-[#06C167]">FCFA</span>
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#06C167]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#06C167] transition-all group-hover:bg-[#06C167] group-hover:text-white group-active:bg-[#06C167] group-active:text-white">
                            Voir <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                          </span>
                        </div>
                      </div>

                      {/* Photo right with floating + button */}
                      <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                        <SmartImage
                          src={dish.image}
                          alt={dish.name}
                          ratio="1 / 1"
                          width={112}
                          height={112}
                          wrapperClassName="!h-full"
                          className="pointer-events-none"
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
                          className={`absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#06C167] text-white shadow-[0_8px_20px_-6px_rgba(6,193,103,0.7)] ring-2 ring-background transition-transform hover:scale-110 hover:bg-[#05a558] active:scale-95 ${qtyOf(dish.id) > 0 ? "hidden" : ""}`}
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

          <RestaurantReviews restoId={restaurant.id} baseRating={restaurant.rating} />
        </div>
      </div>
    </div>
  );
}
