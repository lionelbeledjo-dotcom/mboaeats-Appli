import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { SmartBack } from "@/components/SmartBack";
import { DishSkeleton } from "@/components/Skeleton";
import { getDish, type Dish, type Restaurant } from "@/data/restaurants";

export const Route = createFileRoute("/restaurants/$restoId/plats/$platId")({
  loader: ({ params }) => {
    const result = getDish(params.restoId, params.platId);
    if (!result) throw notFound();
    return result;
  },
  staleTime: Infinity,
  pendingMs: 100,
  pendingComponent: DishSkeleton,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.dish.name} — ${loaderData.restaurant.name}`
          : "Plat",
      },
      { name: "description", content: loaderData?.dish.description ?? "" },
    ],
  }),
  component: DishPage,
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Plat introuvable.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">
        Retour à l'accueil
      </Link>
    </div>
  ),
});

function DishPage() {
  const { restaurant, dish } = Route.useLoaderData() as { restaurant: Restaurant; dish: Dish };
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    dish.options?.forEach((o) => (init[o.label] = o.choices[0].name));
    return init;
  });

  const total = useMemo(() => {
    let extras = 0;
    dish.options?.forEach((o) => {
      const c = o.choices.find((c) => c.name === picked[o.label]);
      extras += c?.extra ?? 0;
    });
    return (dish.price + extras) * qty;
  }, [dish, picked, qty]);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Cover image */}
      <div className="relative h-72 w-full overflow-hidden md:h-96">
        <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        <div className="absolute inset-x-0 top-0 p-4 pt-5">
          <SmartBack
            backTo="/restaurants/$restoId"
            backParams={{ restoId: restaurant.id }}
            crumbs={[
              { label: "Accueil", to: "/" },
              {
                label: restaurant.name,
                to: "/restaurants/$restoId",
                params: { restoId: restaurant.id },
              },
              { label: dish.name },
            ]}
          />
        </div>
      </div>

      <div className="container mx-auto -mt-10 max-w-2xl px-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-glow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to="/restaurants/$restoId"
                params={{ restoId: restaurant.id }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {restaurant.name} · {restaurant.city}
              </Link>
              <h1 className="mt-1 text-2xl font-bold">{dish.name}</h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {restaurant.rating}
                </span>
                {dish.spicy && (
                  <span className="flex items-center gap-1 text-primary">
                    <Flame className="h-3.5 w-3.5" /> Épicé
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
              {dish.price.toLocaleString("fr-FR")} FCFA
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{dish.description}</p>
        </div>

        {/* Options */}
        {dish.options?.map((opt) => (
          <section key={opt.label} className="mt-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {opt.label}
            </h2>
            <div className="space-y-2">
              {opt.choices.map((ch) => {
                const active = picked[opt.label] === ch.name;
                return (
                  <button
                    key={ch.name}
                    onClick={() => setPicked({ ...picked, [opt.label]: ch.name })}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span className={active ? "font-semibold text-foreground" : ""}>{ch.name}</span>
                    <span className="text-xs">
                      {ch.extra ? `+${ch.extra.toLocaleString("fr-FR")} FCFA` : "Inclus"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Quantity */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-3">
          <span className="text-sm font-semibold">Quantité</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60"
              aria-label="Diminuer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center font-bold">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
              aria-label="Augmenter"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-24 z-40 px-4 md:bottom-6">
        <div className="mx-auto max-w-2xl">
          <Link
            to="/checkout"
            className="flex items-center justify-between rounded-full bg-gradient-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ajouter au panier
            </span>
            <span>{total.toLocaleString("fr-FR")} FCFA</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
