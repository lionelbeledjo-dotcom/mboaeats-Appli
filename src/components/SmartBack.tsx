import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

type Props = {
  /** Fallback route used when there is no history entry to go back to */
  backTo: string;
  backParams?: Record<string, string>;
  crumbs: Crumb[];
};

export function SmartBack({ backTo, backParams, crumbs }: Props) {
  const router = useRouter();

  const handleBack = () => {
    // If we have a real previous entry inside the SPA, use it.
    // Otherwise fall back to the hierarchical parent route.
    const canGoBack =
      typeof window !== "undefined" && window.history.length > 1 && document.referrer !== "";
    if (canGoBack) {
      router.history.back();
    } else {
      router.navigate({ to: backTo as never, params: backParams as never });
    }
  };

  return (
    <div className="flex items-center gap-3 animate-fade-in">
      <button
        onClick={handleBack}
        aria-label="Retour"
        className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:bg-black/60 active:scale-95"
      >
        <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.4} />
      </button>

      <nav
        aria-label="Fil d'Ariane"
        className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/30 px-4 py-2 backdrop-blur-xl"
      >
        <ol className="flex items-center gap-1 overflow-x-auto text-xs text-white/75 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={i} className="flex shrink-0 items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                {isLast || !c.to ? (
                  <span
                    className={`max-w-[14ch] truncate ${
                      isLast ? "font-semibold text-white" : ""
                    }`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    to={c.to as never}
                    params={c.params as never}
                    className="max-w-[14ch] truncate transition-colors hover:text-white"
                  >
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
