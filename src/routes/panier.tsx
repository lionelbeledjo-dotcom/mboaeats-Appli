import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Panier — MboaEats" },
      { name: "description", content: "Votre panier MboaEats : modifiez vos articles et passez commande." },
    ],
  }),
  component: PanierPage,
});

const DELIVERY_FEE = 1000; // FCFA — frais standards

function PanierPage() {
  const navigate = useNavigate();
  const { items, subtotal, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-background">
        <header className="px-4 pt-6 pb-2">
          <h1 className="font-display text-2xl font-bold text-foreground">Panier</h1>
        </header>
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          description="Ajoutez vos plats préférés pour passer commande."
          ctaLabel="Explorer les restaurants"
          ctaHref="/recherche"
        />
      </main>
    );
  }

  const total = subtotal + DELIVERY_FEE;

  return (
    <main className="min-h-[calc(100vh-80px)] bg-background pb-40">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Panier <span className="text-muted-foreground text-base font-medium">({items.length})</span>
        </h1>
      </header>

      <ul className="mx-auto max-w-2xl divide-y divide-border px-4">
        {items.map((it) => (
          <li key={it.id} className="flex gap-3 py-4">
            {it.image ? (
              <img
                src={it.image}
                alt={it.name}
                loading="lazy"
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-1 flex-col justify-between min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm text-foreground line-clamp-2">{it.name}</h3>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  aria-label={`Supprimer ${it.name}`}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex items-center gap-1 rounded-full border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQty(it.id, it.qty - 1)}
                    aria-label="Diminuer la quantité"
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
                    {it.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(it.id, it.qty + 1)}
                    aria-label="Augmenter la quantité"
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="price price-lg text-foreground">
                  {(it.price * it.qty).toLocaleString("fr-FR")}
                  <span className="currency"> FCFA</span>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section className="mx-auto mt-4 max-w-2xl space-y-2 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="text-foreground font-medium">{subtotal.toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais de livraison</span>
            <span className="text-foreground font-medium">{DELIVERY_FEE.toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="border-t border-border pt-2.5 flex justify-between">
            <span className="font-display font-bold text-foreground">Total</span>
            <span className="font-display font-bold text-foreground text-lg">
              {total.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        </div>
      </section>

      {/* CTA Commander fixe en bas */}
      <div
        className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 px-4 pb-2"
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/checkout" })}
          className="mx-auto flex w-full max-w-2xl h-14 min-h-[48px] items-center justify-between rounded-full px-6 text-base font-bold uppercase tracking-wide text-white shadow-lg transition-transform active:scale-[0.98]"
          style={{ backgroundColor: "#22C55E" }}
        >
          <span>Commander</span>
          <span className="flex items-center gap-2">
            <span>{total.toLocaleString("fr-FR")} FCFA</span>
            <ArrowRight className="h-5 w-5" />
          </span>
        </button>
      </div>
    </main>
  );
}
