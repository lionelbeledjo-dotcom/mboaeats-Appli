import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";
import { SmartBack } from "@/components/SmartBack";
import { DishSkeleton } from "@/components/Skeleton";
import { getDish, type Dish, type Restaurant } from "@/data/restaurants";
import { addToCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/restaurants/$restoId_/plats/$platId")({
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
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
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
      {/* Cover image — hauteur fixe, pas de chevauchement */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "40vh", maxHeight: 420 }}
      >
        <SmartImage src={dish.image} alt={dish.name} ratio="4 / 3" loading="eager" wrapperClassName="!aspect-auto h-full" />
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

      <div className="container mx-auto max-w-2xl px-4 pt-6">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to="/restaurants/$restoId"
                params={{ restoId: restaurant.id }}
                className="text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                {restaurant.name} · {restaurant.city}
              </Link>
              <h1 className="mt-1 font-display text-2xl font-medium tracking-tight">{dish.name}</h1>
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
            <span className="price shrink-0 rounded-full bg-primary/15 px-3 py-1 text-primary">
              {dish.price.toLocaleString("fr-FR")}<span className="price-currency">FCFA</span>
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
                    <span className="price price-sm">
                      {ch.extra ? <>+{ch.extra.toLocaleString("fr-FR")}<span className="price-currency">FCFA</span></> : "Inclus"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Instructions spéciales */}
        <section className="mt-6 rounded-2xl border border-border/60 bg-card p-4">
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#06C167] text-white shadow-[0_8px_20px_-6px_rgba(6,193,103,0.7)] transition-transform hover:scale-105 active:scale-95"
              aria-label="Augmenter"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-24 z-40 px-4 md:bottom-6">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => {
              const unit = total / qty;
              const optKey = Object.entries(picked).map(([k, v]) => `${k}:${v}`).join("|");
              const extras = (dish.options ?? [])
                .map((o) => {
                  const c = o.choices.find((c) => c.name === picked[o.label]);
                  return c?.extra ? { name: `${o.label}: ${c.name}`, price: c.extra } : null;
                })
                .filter((x): x is { name: string; price: number } => x !== null);
              addToCart({
                id: `${dish.id}__${optKey}`,
                dishId: dish.id,
                restoId: restaurant.id,
                name: dish.name,
                price: unit,
                qty,
                image: dish.image,
                options: picked,
                extras,
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
            className="flex w-full items-center justify-between rounded-full bg-[#06C167] px-6 py-4 text-sm font-medium text-white shadow-[0_12px_32px_-10px_rgba(6,193,103,0.7)] transition active:scale-[0.98]"
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
