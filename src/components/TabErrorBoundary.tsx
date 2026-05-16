import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
};

type State = { hasError: boolean; error: Error | null };

export function TabErrorFallback({
  title = "Cette section a rencontré un problème",
  description = "Vous pouvez réessayer sans quitter l'application.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl border border-border bg-surface/70 p-5 text-center shadow-card">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-base font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[TabErrorBoundary] erreur locale", { error, info });
  }

  retry = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <TabErrorFallback
        title={this.props.title}
        description={this.props.description}
        onRetry={this.retry}
      />
    );
  }
}