import { Link, useLocation, useRouter, useNavigate } from "@tanstack/react-router";
import { Home, Search, ShoppingCart, ClipboardList, User } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";

type Item = {
  to: "/" | "/explorer" | "/panier" | "/commandes" | "/profil";
  label: string;
  icon: typeof Home;
  exact?: boolean;
  match?: RegExp;
};

const items: Item[] = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/explorer", label: "Explorer", icon: Search, match: /^\/(explorer|recherche|cuisines|categorie|decouvrir|populaire|proximite)/ },
  { to: "/panier", label: "Panier", icon: ShoppingCart, match: /^\/(panier|checkout)/ },
  { to: "/commandes", label: "Commandes", icon: ClipboardList, match: /^\/(commandes|suivi)/ },
  { to: "/profil", label: "Profil", icon: User, match: /^\/(profil|compte|adresses|preferences|fidelite|parrainage|mboapass|favoris)/ },
];

export function BottomDock() {
  const location = useLocation();
  const router = useRouter();
  const navigate = useNavigate();
  const path = location.pathname;
  const { count } = useCart();

  useEffect(() => {
    items.forEach((it) => {
      router.preloadRoute({ to: it.to }).catch(() => {});
    });
  }, [router]);

  if (/^\/(connexion|inscription|reset-password|admin|superadmin|restaurant|livreur)/.test(path)) {
    return null;
  }

  return (
    <>
      {/* Spacer 80px (70px barre + safe area) */}
      <div className="h-[calc(80px+env(safe-area-inset-bottom))]" aria-hidden />
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-50 bg-white pb-[env(safe-area-inset-bottom)]"
        style={{
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
          borderTop: "1px solid #F3F4F6",
          fontFamily: "Poppins, Inter, sans-serif",
        }}
      >
        <div className="mx-auto flex h-[70px] max-w-md items-stretch justify-around px-1">
          {items.map((it) => {
            const active = it.exact
              ? path === it.to
              : it.match
                ? it.match.test(path)
                : path.startsWith(it.to);
            const Icon = it.icon;
            const showCartBadge = it.label === "Panier" && count > 0;
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
                className="group relative flex min-w-[60px] flex-1 items-center justify-center py-1.5 touch-manipulation focus-visible:outline-none active:scale-95 transition-transform duration-150"
                style={{ minHeight: 60 }}
              >
                <span
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-all duration-200"
                  style={{
                    paddingLeft: active ? 16 : 8,
                    paddingRight: active ? 16 : 8,
                    backgroundColor: active ? "#F0FDF4" : "transparent",
                    color: active ? "#22C55E" : "#9CA3AF",
                  }}
                >
                  <span className="relative flex h-6 w-6 items-center justify-center">
                    <Icon
                      className="transition-transform duration-200"
                      style={{
                        width: 22,
                        height: 22,
                        transform: active ? "scale(1.1)" : "scale(1)",
                        strokeWidth: active ? 2.4 : 2,
                      }}
                    />
                    {showCartBadge && (
                      <span
                        className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 leading-none text-white ring-2 ring-white tabular-nums"
                        style={{
                          backgroundColor: "#EF4444",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  <span
                    className="leading-none whitespace-nowrap"
                    style={{
                      fontSize: 10,
                      fontWeight: active ? 700 : 400,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {it.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
