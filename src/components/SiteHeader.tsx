import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, UtensilsCrossed, LifeBuoy } from "lucide-react";
import { MboaEatsLogo } from "@/components/brand/MboaEatsLogo";
import { cn } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}> = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/commandes", label: "Commandes", icon: ShoppingBag },
  { to: "/restaurant", label: "Restaurants", icon: UtensilsCrossed },
  { to: "/aide", label: "Support", icon: LifeBuoy },
];

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full",
        "border-b border-white/5",
        "bg-[hsl(240_10%_8%_/_0.72)] backdrop-blur-xl backdrop-saturate-150",
        "supports-[backdrop-filter]:bg-[hsl(240_10%_8%_/_0.55)]",
      )}
    >
      {/* Filets lumineux décoratifs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cm-green/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          aria-label="MboaEats — Accueil"
          className="group inline-flex shrink-0 items-center transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <MboaEatsLogo size="sm" align="start" variant="ghost" badgeSize="sm" />
        </Link>

        {/* Navigation desktop */}
        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
              const active = isActive(to, exact);
              return (
                <li key={to}>
                  <Link
                    to={to as any}
                    className={cn(
                      "group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-tight",
                      "text-white/70 transition-all duration-300 ease-out",
                      "hover:text-white hover:bg-white/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cm-green/60",
                      active && "text-white bg-white/[0.06]",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-transform duration-300",
                        "group-hover:-translate-y-0.5 group-hover:scale-110",
                        active && "text-brand-cm-green",
                      )}
                      strokeWidth={2.25}
                    />
                    <span>{label}</span>
                    {/* Indicateur actif animé */}
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-x-3 -bottom-[3px] h-[2px] rounded-full bg-brand-cm-green transition-all duration-300 ease-out",
                        active
                          ? "scale-x-100 opacity-100 shadow-[0_0_12px_rgba(6,193,103,0.7)]"
                          : "scale-x-0 opacity-0 group-hover:scale-x-50 group-hover:opacity-60",
                      )}
                      style={{ transformOrigin: "center" }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* CTA */}
        <Link
          to="/commandes"
          className={cn(
            "hidden shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold sm:inline-flex",
            "bg-brand-cm-green text-brand-cm-green-fg shadow-badge",
            "transition-all duration-300 ease-out hover:scale-105 hover:shadow-[0_8px_24px_-8px_rgba(6,193,103,0.6)]",
            "active:scale-95",
          )}
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={2.5} />
          Commander
        </Link>
      </div>

      {/* Navigation mobile (scrollable) */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden border-t border-white/5"
      >
        <ul className="flex items-center gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <li key={to} className="shrink-0">
                <Link
                  to={to as any}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    active
                      ? "bg-brand-cm-green/15 text-brand-cm-green ring-1 ring-brand-cm-green/40"
                      : "text-white/65 hover:text-white hover:bg-white/5",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

export default SiteHeader;
