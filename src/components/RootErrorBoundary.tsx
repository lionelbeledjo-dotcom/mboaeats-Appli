import { Component, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

/**
 * Boundary global : empêche qu'un crash de page (Profil, Commandes, etc.)
 * démolisse tout l'AppShell (header + bottom dock). Localise l'erreur dans
 * la zone <Outlet /> uniquement.
 */
export class RootErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[RootErrorBoundary]", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
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
          <Link
            to="/"
            onClick={this.reset}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Accueil
          </Link>
        </div>
      </main>
    );
  }
}
