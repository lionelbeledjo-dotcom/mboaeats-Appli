import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Component, useEffect, useState, type ReactNode } from "react";
import { Minus, Plus, Trash2, X, UserPlus, Gift, ChevronRight, ShoppingCart, ShoppingBag } from "lucide-react";
import { useCart, clearCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { SmartImage } from "@/components/SmartImage";
import { getRestaurant } from "@/data/restaurants";

/**
 * Panier — refonte AppShell stable.
 *
 * Avant : page rendue en `position: fixed inset-x-0 top-0` + `useScrollLock`
 * pour simuler un overlay. Effet de bord : à l'ouverture la page actuelle
 * était figée puis "remontait" car body passait en overflow hidden, et un
 * espace vide apparaissait sous le panier sur certains viewports parce que
 * la zone fixée s'arrêtait avant le bas (bottom = 70px + safe-area), sans
 * tenir compte des écrans dont le BottomDock fait plus ou moins.
 *
 * Maintenant : route normale dans le flux du shell. Le `<main>` du shell
 * gère le scroll, le BottomDock est en `fixed` au-dessus, et le CTA
 * "Passer au paiement" est en `position: sticky; bottom: dockHeight`. Plus
 * aucun overlay, plus aucun scroll lock, plus aucun saut.
 */

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Panier — MboaEats" },
      { name: "description", content: "Votre panier MboaEats : modifiez vos articles et passez commande." },
    ],
  }),
  component: PanierRoute,
});

// Offset réservé au BottomDock (var partagée définie dans styles.css).
// Centralisé : si la hauteur du dock change, un seul endroit à toucher.
const STICKY_BOTTOM_OFFSET = "var(--bottom-dock-h)";

class PanierErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Panier] render error", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          description="Ajoutez vos plats préférés pour passer commande."
          ctaLabel="Retour à l'accueil"
          ctaHref="/"
        />
      );
    }
    return this.props.children;
  }
}

function PanierRoute() {
  // Avoid SSR/CSR mismatch from persisted cart (localStorage) — render after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-6" aria-busy="true">
        <div className="h-6 w-32 animate-pulse rounded-md bg-primary/10" />
        <div className="mt-4 h-24 w-full animate-pulse rounded-2xl bg-primary/10" />
      </main>
    );
  }
  return (
    <PanierErrorBoundary>
      <PanierPage />
    </PanierErrorBoundary>
  );
}

function PanierPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const setQty = cart?.setQty ?? (() => {});
  const remove = cart?.remove ?? (() => {});
  const [promoChecked, setPromoChecked] = useState(false);

  if (!items || items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-md bg-white text-black">
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link to="/" resetScroll={false} aria-label="Fermer" className="p-2 -ml-2">
            <X className="h-6 w-6 text-black" strokeWidth={2.5} />
          </Link>
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

  const restoId = items[0]?.restoId;
  const resto = restoId ? getRestaurant(restoId) : null;
  const restoName = resto?.name ?? "Votre commande";

  return (
    <main
      className="mx-auto w-full max-w-md bg-white text-black font-sans"
      style={{ paddingBottom: STICKY_BOTTOM_OFFSET }}
    >
      {/* Header sticky : reste visible pendant le scroll de la liste */}
      <header
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Link to="/" resetScroll={false} aria-label="Fermer" className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100 transition-colors">
            <X className="h-6 w-6 text-black" strokeWidth={2.5} />
          </Link>
          <button
            type="button"
            aria-label="Ajouter une personne"
            className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100 transition-colors"
          >
            <UserPlus className="h-6 w-6 text-black" strokeWidth={2.25} />
          </button>
        </div>
        <h1 className="px-4 pt-1 pb-3 text-[24px] font-bold tracking-tight leading-tight truncate">{restoName}</h1>
      </header>

      {/* Liste articles */}
      <ul className="divide-y divide-gray-100">
        {items.map((it) => (
          <li key={it.id} className="flex gap-4 px-4 py-5">
            {it.image ? (
              <div
                className="shrink-0 overflow-hidden rounded-2xl bg-gray-100"
                style={{ width: 96, height: 96, aspectRatio: "1 / 1", flex: "0 0 96px" }}
              >
                <SmartImage
                  src={it.image}
                  alt={it.name}
                  ratio="1 / 1"
                  width={96}
                  height={96}
                  wrapperClassName="!h-full !w-full"
                />
              </div>
            ) : (
              <div
                className="flex shrink-0 items-center justify-center rounded-2xl bg-gray-100"
                style={{ width: 96, height: 96, flex: "0 0 96px" }}
              >
                <ShoppingBag className="h-7 w-7 text-gray-400" />
              </div>
            )}
            <div className="flex flex-1 flex-col min-w-0">
              <h3 className="text-[15px] font-bold leading-snug text-black">{it.name}</h3>
              {it.options && Object.keys(it.options).length > 0 && (
                <p className="mt-1 text-[13px] text-gray-500 leading-snug line-clamp-3">
                  {Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </p>
              )}
              {it.note && (
                <p className="mt-1 text-[13px] text-gray-500 italic line-clamp-2">{it.note}</p>
              )}
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="text-[15px] font-semibold text-black">
                  {(it.price * it.qty).toLocaleString("fr-FR")} FCFA
                </span>
                <div className="inline-flex h-11 items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => (it.qty <= 1 ? remove(it.id) : setQty(it.id, it.qty - 1))}
                    aria-label={it.qty <= 1 ? `Supprimer ${it.name}` : "Diminuer la quantité"}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C167]/10 text-[#06C167] transition-transform active:scale-90"
                  >
                    {it.qty <= 1 ? (
                      <Trash2 className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" strokeWidth={2.8} />
                    )}
                  </button>
                  <span className="min-w-[2rem] px-1 text-center text-[15px] font-bold tabular-nums text-black">
                    {it.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(it.id, it.qty + 1)}
                    aria-label="Augmenter la quantité"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C167] text-white shadow-sm transition-transform active:scale-90"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.8} />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* + Ajouter des articles */}
      <div className="px-4 py-4 flex justify-end">
        <button
          type="button"
          onClick={() => restoId && navigate({ to: "/restaurants/$restoId", params: { restoId } })}
          className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-5 py-3 text-[14px] font-semibold text-black active:scale-[0.98] transition-transform"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Ajouter des articles
        </button>
      </div>

      {/* Envoyez en cadeau */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-4 border-t border-gray-100 active:bg-gray-50 transition-colors"
      >
        <Gift className="h-6 w-6 text-[#06C167]" aria-hidden />
        <span className="flex-1 text-left">
          <span className="block text-[15px] font-bold text-black">Envoyez en cadeau</span>
          <span className="block text-[13px] text-gray-500">Et personnalisez une carte numérique</span>
        </span>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </button>

      {/* Sous-total */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
        <span className="text-[18px] font-bold text-black">Sous-total</span>
        <span className="text-[18px] font-bold text-black">
          {subtotal.toLocaleString("fr-FR")} FCFA
        </span>
      </div>

      {/* Footer sticky — collé juste au-dessus du BottomDock, peu importe la
          hauteur de viewport. Plus de saut, plus d'espace vide en bas. */}
      <div
        className="sticky z-20 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ bottom: STICKY_BOTTOM_OFFSET }}
      >
        <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={promoChecked}
            onChange={(e) => setPromoChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-gray-300 accent-black"
          />
          <span className="min-w-0 text-[13px] leading-snug text-black">
            Économisez <span className="font-bold text-amber-600">500 FCFA</span> sur cette commande en essayant gratuitement <span className="font-semibold">MboaPass</span>
          </span>
        </label>
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/checkout" })}
            className="flex w-full h-14 items-center justify-center rounded-2xl bg-black text-white text-[16px] font-semibold shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-transform"
          >
            Passer au paiement
          </button>
        </div>
      </div>
    </main>
  );
}
