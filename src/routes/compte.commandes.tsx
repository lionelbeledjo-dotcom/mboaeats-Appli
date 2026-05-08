import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, RotateCcw, Star, Utensils } from "lucide-react";
import { addToCart, clearCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/compte/commandes")({
  component: CommandesPage,
  head: () => ({
    meta: [
      { title: "Mes commandes · MboaEats" },
      { name: "description", content: "Historique de vos commandes MboaEats." },
    ],
  }),
});

type Order = {
  id: string;
  dish: string;
  restaurant: string;
  date: string;
  price: number;
  rating: number;
  image: string;
};

const ORDERS: Order[] = [
  {
    id: "C-2941",
    dish: "Ndolè royal aux crevettes",
    restaurant: "Chez Mama Africa",
    date: "Hier · 19:42",
    price: 6500,
    rating: 5,
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=70",
  },
  {
    id: "C-2912",
    dish: "Poulet DG maison",
    restaurant: "Le Wouri Grill",
    date: "06 mai · 13:11",
    price: 8200,
    rating: 4,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=70",
  },
  {
    id: "C-2887",
    dish: "Eru fumé + bâton de manioc",
    restaurant: "Bafoussam Soul",
    date: "05 mai · 21:05",
    price: 4500,
    rating: 5,
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=70",
  },
  {
    id: "C-2853",
    dish: "Suya combo XL",
    restaurant: "Yaoundé Street",
    date: "03 mai · 12:38",
    price: 3800,
    rating: 4,
    image: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&q=70",
  },
];

function formatFcfa(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function CommandesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/aide" hash="categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display font-bold">Mes commandes</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Utensils className="h-4 w-4 text-primary" /> {ORDERS.length} commandes récentes
        </div>

        <div className="grid gap-4">
          {ORDERS.map((o) => (
            <article
              key={o.id}
              className="group overflow-hidden rounded-3xl border border-border bg-surface/60 shadow-card transition hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative h-40 w-full sm:h-auto sm:w-44 shrink-0 overflow-hidden">
                  <img
                    src={o.image}
                    alt={o.dish}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{o.date} · {o.id}</p>
                    <h3 className="mt-1 font-display text-lg font-bold leading-tight">{o.dish}</h3>
                    <p className="text-sm text-muted-foreground">{o.restaurant}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < o.rating ? "fill-gold text-gold" : "text-muted-foreground/40"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-base font-bold text-gradient-primary">{formatFcfa(o.price)}</span>
                    <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]">
                      <RotateCcw className="h-3.5 w-3.5" /> Commander à nouveau
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
