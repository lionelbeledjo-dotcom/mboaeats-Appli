import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Star, Clock, MapPin, Flame } from "lucide-react";
import { SmartBack } from "@/components/SmartBack";
import { getRestaurant } from "@/data/restaurants";

export const Route = createFileRoute("/restaurants/$restoId")({
  loader: ({ params }) => {
    const r = getRestaurant(params.restoId);
    if (!r) throw notFound();
    return { restaurant: r };
  },
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
  const { restaurant } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero cover */}
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        <img
          src={restaurant.cover}
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background" />
        <div className="absolute inset-x-0 top-0 p-4 pt-5">
          <SmartBack
            backTo="/"
            crumbs={[
              { label: "Accueil", to: "/" },
              { label: restaurant.name },
            ]}
          />
        </div>
      </div>

      <div className="container mx-auto -mt-12 max-w-3xl px-4 pb-12">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-glow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{restaurant.tagline}</p>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              Ouvert
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {restaurant.rating}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {restaurant.eta}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {restaurant.city}
            </span>
          </div>
        </div>

        {/* Menu categories */}
        <div className="mt-8 space-y-8">
          {restaurant.categories.map((cat) => (
            <section key={cat.id}>
              <h2 className="mb-3 text-lg font-bold">{cat.label}</h2>
              <ul className="space-y-3">
                {cat.dishes.map((dish) => (
                  <li key={dish.id}>
                    <Link
                      to="/restaurants/$restoId/plats/$platId"
                      params={{ restoId: restaurant.id, platId: dish.id }}
                      className="group flex gap-3 rounded-2xl border border-border/50 bg-card p-3 transition hover:border-primary/40 hover:shadow-glow"
                    >
                      <img
                        src={dish.image}
                        alt={dish.name}
                        loading="lazy"
                        width={96}
                        height={96}
                        className="h-24 w-24 shrink-0 rounded-xl object-cover"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold">{dish.name}</h3>
                          {dish.popular && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                              POPULAIRE
                            </span>
                          )}
                          {dish.spicy && (
                            <Flame className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {dish.description}
                        </p>
                        <div className="mt-auto pt-2">
                          <span className="font-bold text-primary">
                            {dish.price.toLocaleString("fr-FR")} FCFA
                          </span>
                        </div>
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
