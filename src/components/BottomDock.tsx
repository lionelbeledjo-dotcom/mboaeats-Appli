import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, Users, User, Package } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useActiveOrdersCount } from "@/hooks/use-active-orders";

type Item = {
  to: "/" | "/commandes" | "/checkout" | "/tablee" | "/profil";
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const items: Item[] = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/commandes", label: "Mes Commandes", icon: Package },
  { to: "/checkout", label: "Panier", icon: ShoppingBag },
  { to: "/tablee", label: "Tablée", icon: Users },
  { to: "/profil", label: "Profil", icon: User },
];

export function BottomDock() {
  const location = useLocation();
  const path = location.pathname;
  const { count } = useCart();
  const activeOrders = useActiveOrdersCount();

  if (/^\/(admin|restaurant|livreur)/.test(path)) return null;

  return (
    <>
      <div className="h-24" aria-hidden />
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-md px-3 pb-3 pt-2">
          <div className="rounded-3xl border border-border/60 bg-background/85 px-2 py-2 shadow-glow backdrop-blur-xl">
            <ul className="flex items-end justify-between">
              {items.map((it) => {
                const active = it.exact ? path === it.to : path.startsWith(it.to);
                const Icon = it.icon;
                const isCenter = it.label === "Panier";
                const badge =
                  it.label === "Panier"
                    ? count
                    : it.label === "Mes Commandes"
                      ? activeOrders
                      : 0;
                const badgePulse = it.label === "Mes Commandes" && activeOrders > 0;

                return (
                  <li key={it.to} className="flex-1">
                    <Link
                      to={it.to}
                      aria-label={
                        it.label === "Panier" && count > 0
                          ? `Panier, ${count} article${count > 1 ? "s" : ""}`
                          : it.label === "Mes Commandes" && activeOrders > 0
                            ? `Mes Commandes, ${activeOrders} en cours`
                            : it.label
                      }
                      className="group relative flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5"
                    >
                      <span
                        className={
                          isCenter
                            ? `relative flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl shadow-glow transition-transform ${
                                active
                                  ? "bg-gradient-primary text-primary-foreground scale-105"
                                  : "bg-gradient-primary text-primary-foreground"
                              }`
                            : `relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                                active
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                              }`
                        }
                      >
                        <Icon className={isCenter ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={active ? 2.4 : 2} />
                        {badge > 0 ? (
                          <span
                            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground tabular-nums ring-2 ring-background ${
                              badgePulse ? "animate-pulse" : ""
                            }`}
                          >
                            {badge > 99 ? "99+" : badge}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`text-[10px] font-semibold leading-none ${
                          active ? "text-foreground" : "text-muted-foreground"
                        } ${isCenter ? "-mt-2" : ""}`}
                      >
                        {it.label}
                      </span>
                      {active && !isCenter && (
                        <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
