import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

const HIDDEN = ["/connexion", "/admin-login", "/checkout"];

export function CartFab() {
  const { count, subtotal } = useCart();
  const { pathname } = useLocation();

  if (count === 0) return null;
  if (HIDDEN.includes(pathname) || pathname.startsWith("/admin")) return null;

  return (
    <Link
      to="/checkout"
      aria-label={`Voir le panier (${count} article${count > 1 ? "s" : ""})`}
      className="fixed bottom-28 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-95 md:bottom-6"
    >
      <div className="relative">
        <ShoppingBag className="h-5 w-5" />
        <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1 text-[11px] font-bold text-primary ring-2 ring-primary">
          {count}
        </span>
      </div>
      <span className="text-xs font-bold">
        {subtotal.toLocaleString("fr-FR")} FCFA
      </span>
    </Link>
  );
}
