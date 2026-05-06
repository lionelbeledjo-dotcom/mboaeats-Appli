import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, ShoppingCart, Users, User } from "lucide-react";

type Item = {
  to: "/" | "/mboa-ai" | "/checkout" | "/tablee" | "/fidelite";
  label: string;
  icon: typeof Home;
  exact?: boolean;
  badge?: number;
};

const items: Item[] = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/mboa-ai", label: "Recherche", icon: Search },
  { to: "/checkout", label: "Panier", icon: ShoppingCart, badge: 2 },
  { to: "/tablee", label: "Tablée", icon: Users },
  { to: "/fidelite", label: "Profil", icon: User },
];

export function BottomDock() {
  const location = useLocation();
  const path = location.pathname;

  // Hide on admin/restaurant/livreur back-office spaces
  if (/^\/(admin|restaurant|livreur)/.test(path)) return null;

  return (
    <>
      {/* spacer so content is not hidden under the dock */}
      <div className="h-20 md:h-0" aria-hidden />
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      >
        <div className="mx-auto max-w-md px-3 pb-3 pt-2">
          <div className="rounded-3xl border border-border/60 bg-background/85 px-2 py-2 shadow-glow backdrop-blur-xl">
            <ul className="flex items-end justify-between">
              {items.map((it) => {
                const active = it.exact ? path === it.to : path.startsWith(it.to);
                const Icon = it.icon;
                const isCenter = it.label === "Panier";
                return (
                  <li key={it.to} className="flex-1">
                    <Link
                      to={it.to}
                      className="group relative flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5"
                    >
                      <span
                        className={
                          isCenter
                            ? `flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl shadow-glow transition-transform ${
                                active
                                  ? "bg-gradient-primary text-primary-foreground scale-105"
                                  : "bg-gradient-primary text-primary-foreground"
                              }`
                            : `flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                                active
                                  ? "bg-primary/15 text-primary"
                                  : "text-muted-foreground group-hover:text-foreground"
                              }`
                        }
                      >
                        <Icon className={isCenter ? "h-5 w-5" : "h-[18px] w-[18px]"} strokeWidth={active ? 2.4 : 2} />
                        {it.badge ? (
                          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                            {it.badge}
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
