import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Détecte les "Failed to fetch dynamically imported module" qui surviennent
 * quand un déploiement invalide les anciens chunks JS. Auto-reload silencieux
 * une seule fois (anti-boucle via sessionStorage).
 */
function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

const RELOAD_KEY = "__mboa_chunk_reload_at";

function tryAutoReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
    const now = Date.now();
    // Évite la boucle : un seul reload toutes les 30s max
    if (now - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/**
 * Boundary global : empêche qu'un crash de page (Profil, Commandes, etc.)
 * démolisse tout l'AppShell (header + bottom dock). Localise l'erreur dans
 * la zone <Outlet /> uniquement.
 */
export class RootErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null; reloading: boolean }
> {
  state = { hasError: false, error: null as Error | null, reloading: false };

  static getDerivedStateFromError(error: Error) {
    if (isChunkLoadError(error)) {
      return { hasError: true, error, reloading: true };
    }
    return { hasError: true, error, reloading: false };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[RootErrorBoundary]", error, info);
    if (isChunkLoadError(error)) {
      tryAutoReload();
    }
  }

  componentDidMount() {
    if (typeof window === "undefined") return;
    // Capture les promesses non gérées (lazy imports échoués hors React render)
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
    window.addEventListener("error", this.onWindowError);
  }

  componentWillUnmount() {
    if (typeof window === "undefined") return;
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
    window.removeEventListener("error", this.onWindowError);
  }

  onUnhandledRejection = (e: PromiseRejectionEvent) => {
    if (isChunkLoadError(e.reason)) {
      e.preventDefault();
      tryAutoReload();
    }
  };

  onWindowError = (e: ErrorEvent) => {
    if (isChunkLoadError(e.error) || isChunkLoadError(e.message)) {
      tryAutoReload();
    }
  };

  reset = () => this.setState({ hasError: false, error: null, reloading: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    // Si on tente un reload auto, on affiche un loader minimal (pas l'écran rouge)
    if (this.state.reloading) {
      return (
        <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Mise à jour de l'application…</p>
        </main>
      );
    }

    // Détermine la cible "Accueil" en fonction du contexte (superadmin / admin / client)
    let homeHref = "/";
    let homeLabel = "Accueil";
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const host = window.location.hostname.toLowerCase();
      if (path.startsWith("/superadmin")) {
        homeHref = "/superadmin";
        homeLabel = "Retour au tableau de bord";
      } else if (path.startsWith("/admin") || host.startsWith("admin.")) {
        homeHref = "/admin";
        homeLabel = "Retour au tableau de bord";
      }
    }

    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-foreground">Cette page a rencontré un problème</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pas de panique, le reste de l'application fonctionne toujours.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={this.reset}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Réessayer
          </button>
          <a
            href={homeHref}
            onClick={this.reset}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            {homeLabel}
          </a>
        </div>
      </main>
    );
  }
}
