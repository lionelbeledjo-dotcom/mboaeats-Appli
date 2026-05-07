import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

const HIDDEN = ["/connexion", "/admin/login", "/checkout"];

export function CartFab() {
  const { count, subtotal } = useCart();
  const { pathname } = useLocation();

  if (count === 0) return null;
  if (HIDDEN.includes(pathname) || pathname.startsWith("/admin")) return null;

  const displayCount = count > 99 ? "99+" : String(count);
  const label = `Voir le panier, ${count} article${count > 1 ? "s" : ""}, total ${subtotal.toLocaleString("fr-FR")} francs CFA`;

  return (
    <Link
      to="/checkout"
      aria-label={label}
      role="button"
      className="fixed bottom-24 right-3 z-50 flex items-center gap-2 rounded-full bg-gradient-primary px-3 py-2.5 text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-95 sm:bottom-28 sm:right-4 sm:px-4 sm:py-3 md:bottom-6"
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        <span
          key={count}
          aria-hidden="true"
          className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1 text-[10px] font-bold leading-none text-primary ring-2 ring-primary tabular-nums animate-scale-in sm:h-[22px] sm:min-w-[22px] sm:text-[11px]"
        >
          {displayCount}
        </span>
      </div>
      <span className="text-[11px] font-bold tabular-nums sm:text-xs">
        {subtotal.toLocaleString("fr-FR")} FCFA
      </span>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
