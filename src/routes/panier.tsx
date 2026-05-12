import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, X, UserPlus, Gift, ChevronRight, ShoppingCart, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { EmptyState } from "@/components/EmptyState";
import { getRestaurant } from "@/data/restaurants";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Panier — MboaEats" },
      { name: "description", content: "Votre panier MboaEats : modifiez vos articles et passez commande." },
    ],
  }),
  component: PanierPage,
});

function PanierPage() {
  const navigate = useNavigate();
  const { items, subtotal, setQty, remove } = useCart();
  const [promoChecked, setPromoChecked] = useState(false);

  if (items.length === 0) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-white">
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link to="/" aria-label="Fermer" className="p-2 -ml-2">
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
      className="fixed inset-x-0 top-0 z-10 flex flex-col bg-white text-black font-sans overflow-hidden touch-pan-y overscroll-none"
      style={{ bottom: "calc(70px + env(safe-area-inset-bottom))" }}
    >
      {/* Header fixe */}
      <header className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link to="/" aria-label="Fermer" className="p-2 -ml-2 active:scale-95 transition-transform">
            <X className="h-6 w-6 text-black" strokeWidth={2.5} />
          </Link>
          <button
            type="button"
            aria-label="Ajouter une personne"
            className="p-2 -mr-2 active:scale-95 transition-transform"
          >
            <UserPlus className="h-6 w-6 text-black" strokeWidth={2.25} />
          </button>
        </div>
        <h1 className="px-4 pt-1 pb-3 text-3xl font-bold tracking-tight">{restoName}</h1>
      </header>

      {/* Zone scrollable */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Liste articles */}
        <ul className="divide-y divide-gray-100">
          {items.map((it) => (
            <li key={it.id} className="flex gap-3 px-4 py-5">
              {it.image ? (
                <img
                  src={it.image}
                  alt={it.name}
                  loading="lazy"
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover bg-gray-100"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gray-100">
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
                  <div className="flex items-center gap-1 rounded-full bg-gray-100 px-1 py-1">
                    <button
                      type="button"
                      onClick={() => (it.qty <= 1 ? remove(it.id) : setQty(it.id, it.qty - 1))}
                      aria-label={it.qty <= 1 ? `Supprimer ${it.name}` : "Diminuer la quantité"}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white active:scale-95 transition-transform"
                    >
                      {it.qty <= 1 ? (
                        <Trash2 className="h-4 w-4 text-black" />
                      ) : (
                        <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                      )}
                    </button>
                    <span className="min-w-[1.5rem] text-center text-[15px] font-semibold tabular-nums text-black">
                      {it.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(it.id, it.qty + 1)}
                      aria-label="Augmenter la quantité"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white active:scale-95 transition-transform"
                    >
                      <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
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
          <span className="text-2xl" aria-hidden>🎁</span>
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

        {/* Espace de sécurité pour ne pas être masqué par le footer */}
        <div aria-hidden className="h-6" />
      </div>

      {/* Footer fixe (en bas du conteneur, au-dessus du BottomDock) */}
      <div className="shrink-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <label className="flex items-start gap-3 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={promoChecked}
            onChange={(e) => setPromoChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-2 border-gray-300 accent-black"
          />
          <span className="text-[13px] leading-snug text-black">
            Économisez <span className="font-bold text-amber-600">500 FCFA</span> sur cette commande en essayant gratuitement <span className="font-semibold">MboaPass</span>
          </span>
        </label>
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/checkout" })}
            className="flex w-full h-14 items-center justify-center rounded-2xl bg-black text-white text-[16px] font-semibold active:scale-[0.98] transition-transform"
          >
            Passer au paiement
          </button>
        </div>
      </div>
    </main>
  );
}
