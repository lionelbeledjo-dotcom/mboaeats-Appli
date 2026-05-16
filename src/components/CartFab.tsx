import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

// Whitelist strict : le récap panier sticky n'apparaît QUE sur les pages liées à la commande.
// Jamais sur /profil, /commandes, /favoris, /adresses, /moyens-de-paiement, etc.
const ALLOWED = [/^\/explorer/, /^\/recherche/, /^\/cuisines/, /^\/proximite/, /^\/populaire/, /^\/r\//];

export function CartFab() {
  const { count, subtotal } = useCart();
  const { pathname } = useLocation();

  if (count === 0) return null;
  if (!ALLOWED.some((rx) => rx.test(pathname))) return null;

  const displayCount = count > 99 ? "99+" : String(count);
  const label = `Voir le panier, ${count} article${count > 1 ? "s" : ""}, total ${subtotal.toLocaleString("fr-FR")} francs CFA`;

  return (
    <Link
      to="/checkout"
      aria-label={label}
      role="button"
      className="fixed bottom-24 right-3 z-50 flex items-center gap-2 rounded-full bg-brand-cm-green px-3 py-2.5 text-brand-cm-green-fg shadow-[0_8px_24px_-8px_rgba(6,193,103,0.6)] transition-transform hover:scale-105 active:scale-95 sm:bottom-28 sm:right-4 sm:px-4 sm:py-3 md:bottom-6"
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        <span
          key={count}
          aria-hidden="true"
          className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-brand-cm-green ring-2 ring-brand-cm-green tabular-nums animate-scale-in sm:h-[22px] sm:min-w-[22px] sm:text-[11px]"
        >
          {displayCount}
        </span>
      </div>
      <span className="price price-sm">
        {subtotal.toLocaleString("fr-FR")}<span className="price-currency">FCFA</span>
      </span>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
