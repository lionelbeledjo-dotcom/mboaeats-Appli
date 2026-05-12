import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/**
 * Bannière hors-ligne : se déclenche sur l'event `offline` du navigateur.
 * Bouton « Réessayer » vert (couleur primaire).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[10000] flex items-center justify-center gap-3 bg-foreground px-4 py-2.5 text-background shadow-lg"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium">
        Pas de connexion Internet. Vérifiez votre réseau.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="ml-2 inline-flex h-9 min-h-[36px] items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow hover:bg-accent transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Réessayer
      </button>
    </div>
  );
}

export default OfflineBanner;
