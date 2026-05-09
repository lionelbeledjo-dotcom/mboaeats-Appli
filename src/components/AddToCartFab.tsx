import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";

export function AddToCartFab({ count, total, restoId }: { count: number; total: number; restoId?: string }) {
  if (count === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 px-4">
      <Link
        to="/checkout"
        search={restoId ? { restoId } : undefined}
        className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-black px-5 py-4 text-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.4)] transition-transform active:scale-[0.99]"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-black tabular-nums">
            {count}
          </span>
          <ShoppingBag className="h-4 w-4" strokeWidth={2} />
          <span className="text-sm font-medium">Voir le panier</span>
        </span>
        <span className="price-cta">{total.toLocaleString("fr-FR")}<span className="price-currency">FCFA</span></span>
      </Link>
    </div>
  );
}
