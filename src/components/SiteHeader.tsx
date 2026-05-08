import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, UtensilsCrossed, LifeBuoy, Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  // Ferme le menu burger à chaque changement de route
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloque le scroll body quand le menu est ouvert
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          aria-label="MboaEats — Accueil"
          className="group inline-flex min-w-0 shrink items-center transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
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

        {/* Actions droite */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* CTA desktop / tablette */}
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

          {/* Burger mobile */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full md:hidden",
              "border border-white/10 bg-white/5 text-white",
              "transition-all duration-300 ease-out hover:bg-white/10 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cm-green/60",
            )}
          >
            <span className="relative block h-5 w-5">
              <Menu
                className={cn(
                  "absolute inset-0 h-5 w-5 transition-all duration-300",
                  open ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100",
                )}
                strokeWidth={2.25}
              />
              <X
                className={cn(
                  "absolute inset-0 h-5 w-5 transition-all duration-300",
                  open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0",
                )}
                strokeWidth={2.25}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Backdrop mobile */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-x-0 bottom-0 top-14 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Panneau mobile (liste déroulante) */}
      <nav
        id="mobile-nav-panel"
        aria-label="Navigation mobile"
        className={cn(
          "absolute inset-x-0 top-full z-40 md:hidden",
          "origin-top overflow-hidden border-b border-white/5",
          "bg-[hsl(240_10%_8%_/_0.96)] backdrop-blur-xl",
          "transition-[max-height,opacity] duration-300 ease-out",
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <ul className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }, i) => {
            const active = isActive(to, exact);
            return (
              <li
                key={to}
                style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}
                className={cn(
                  "transition-all duration-300 ease-out",
                  open ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                )}
              >
                <Link
                  to={to as any}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",
                    "transition-all duration-200 active:scale-[0.98]",
                    active
                      ? "bg-brand-cm-green/15 text-brand-cm-green ring-1 ring-brand-cm-green/40"
                      : "text-white/80 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-brand-cm-green/20" : "bg-white/5",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {active && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand-cm-green shadow-[0_0_10px_rgba(6,193,103,0.7)]" />
                  )}
                </Link>
              </li>
            );
          })}

          <li
            style={{ transitionDelay: open ? `${60 + NAV_ITEMS.length * 40}ms` : "0ms" }}
            className={cn(
              "mt-2 transition-all duration-300 ease-out",
              open ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
            )}
          >
            <Link
              to="/commandes"
              onClick={() => setOpen(false)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold",
                "bg-brand-cm-green text-brand-cm-green-fg shadow-badge",
                "transition-all duration-200 active:scale-[0.98]",
              )}
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={2.5} />
              Commander maintenant
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default SiteHeader;
