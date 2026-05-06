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
    <div className="flex items-center gap-3">
      <button
        onClick={handleBack}
        aria-label="Retour"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-md transition hover:bg-muted"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <nav aria-label="Fil d'Ariane" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 overflow-x-auto text-xs text-muted-foreground">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={i} className="flex shrink-0 items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
                {isLast || !c.to ? (
                  <span
                    className={`max-w-[14ch] truncate ${
                      isLast ? "font-semibold text-foreground" : ""
                    }`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link
                    to={c.to as never}
                    params={c.params as never}
                    className="max-w-[14ch] truncate hover:text-foreground"
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
