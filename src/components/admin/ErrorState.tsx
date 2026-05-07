import { AlertTriangle, RotateCw } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-red-500/30 bg-red-500/5 p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <p className="text-sm font-semibold text-red-300">Impossible de charger les données</p>
      <p className="max-w-md text-xs text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
      >
        <RotateCw className="h-3.5 w-3.5" /> Réessayer
      </button>
    </div>
  );
}
