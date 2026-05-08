import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, Package, User, Compass } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useActiveOrdersCount } from "@/hooks/use-active-orders";

type Item = {
  to: "/" | "/decouvrir" | "/commandes" | "/checkout" | "/profil";
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const items: Item[] = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/decouvrir", label: "Découvrir", icon: Compass },
  { to: "/checkout", label: "Panier", icon: ShoppingBag },
  { to: "/commandes", label: "Commandes", icon: Package },
  { to: "/profil", label: "Profil", icon: User },
];

export function BottomDock() {
  const location = useLocation();
  const path = location.pathname;
  const { count } = useCart();
  const { count: activeOrders } = useActiveOrdersCount();

  if (/^\/(admin|restaurant|livreur|connexion)/.test(path)) return null;

  return (
    <>
      <div className="h-24" aria-hidden />
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-md px-4 pb-4">
          <div
            className="flex items-center justify-between rounded-full bg-black px-3 py-2.5 text-white"
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            {items.map((it) => {
              const active = it.exact ? path === it.to : path.startsWith(it.to);
              const Icon = it.icon;
              const badge = it.label === "Panier" ? count : it.label === "Commandes" ? activeOrders : 0;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  aria-label={it.label}
                  className="group relative flex flex-1 items-center justify-center"
                >
                  <span
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      active ? "bg-white text-black" : "text-white/80 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                    {badge > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-black tabular-nums">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
