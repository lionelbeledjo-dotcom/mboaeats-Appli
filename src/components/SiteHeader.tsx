import { Link } from "@tanstack/react-router";
import { MboaEatsLogo } from "@/components/brand/MboaEatsLogo";
import { cn } from "@/lib/utils";

/**
 * Header minimal mobile-first.
 * - Aucune barre de navigation horizontale.
 * - Logo uniquement (la navigation passe par la BottomDock).
 */
export function SiteHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full",
        "border-b border-white/10",
        "bg-black/95 backdrop-blur-xl backdrop-saturate-150 text-white",
        "pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-1",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cm-green/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-center px-3 py-2 sm:min-h-16 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="MboaEats — Accueil"
          className="group inline-flex items-center transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          <MboaEatsLogo size="sm" align="start" variant="ghost" badgeSize="sm" />
        </Link>
      </div>
    </header>
  );
}

export default SiteHeader;
