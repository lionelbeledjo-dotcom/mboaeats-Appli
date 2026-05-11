import { Link, useLocation, useRouter, useNavigate } from "@tanstack/react-router";
import { Home, ShoppingBag, Package, User } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useActiveOrdersCount } from "@/hooks/use-active-orders";

type Item = {
  to: "/" | "/commandes" | "/checkout" | "/profil";
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const items: Item[] = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/commandes", label: "Commandes", icon: Package },
  { to: "/checkout", label: "Panier", icon: ShoppingBag },
  { to: "/profil", label: "Profil", icon: User },
];

export function BottomDock() {
  const location = useLocation();
  const router = useRouter();
  const navigate = useNavigate();
  const path = location.pathname;
  const { count } = useCart();
  const { count: activeOrders } = useActiveOrdersCount();

  // Pré-chargement agressif : toutes les routes de la barre dès le montage.
  useEffect(() => {
    items.forEach((it) => {
      router.preloadRoute({ to: it.to }).catch(() => {});
    });
  }, [router]);


  if (/^\/(admin|restaurant|livreur|connexion)/.test(path)) return null;

  return (
    <>
      {/* Spacer pour que le contenu ne passe jamais sous la barre */}
      <div className="h-[calc(64px+env(safe-area-inset-bottom))]" aria-hidden />
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-[9999] bg-white pb-[env(safe-area-inset-bottom)]"
        style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            const Icon = it.icon;
            const badge = it.label === "Panier" ? count : it.label === "Commandes" ? activeOrders : 0;
            const color = active ? "#06C167" : "#9CA3AF";
            return (
              <Link
                key={it.to}
                to={it.to}
                preload="intent"
                preloadDelay={0}
                aria-label={it.label}
                aria-current={active ? "page" : undefined}
                onPointerEnter={() => router.preloadRoute({ to: it.to }).catch(() => {})}
                onPointerDown={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  if (path === it.to) return;
                  e.preventDefault();
                  navigate({ to: it.to });
                }}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 touch-manipulation focus-visible:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-[#06C167]/60"
                style={{ minHeight: 44 }}
              >
                <span className="relative flex h-7 w-7 items-center justify-center" style={{ color }}>
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white tabular-nums"
                      style={{ backgroundColor: "#06C167" }}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span
                  className="text-[11px] leading-none"
                  style={{ color, fontWeight: active ? 600 : 500 }}
                >
                  {it.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
