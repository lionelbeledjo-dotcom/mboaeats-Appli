import { Check, Loader2, ShieldCheck, X, AlertCircle } from "lucide-react";

type Wallet = "apple" | "google";
type Status = "pending" | "succeeded" | "failed";

export function WalletProcessingOverlay({
  wallet,
  status,
  total,
  reference,
  errorMessage,
  onClose,
  onRetry,
}: {
  wallet: Wallet;
  status: Status;
  total: number;
  reference?: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const isApple = wallet === "apple";
  const label = isApple ? "Apple Pay" : "Google Pay";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Paiement ${label}`}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm animate-fade-in sm:items-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl animate-fade-up sm:rounded-3xl">
        {status !== "pending" && (
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-900 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Wallet badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isApple ? "bg-black text-white" : "bg-white ring-1 ring-gray-200"
            }`}
          >
            {isApple ? (
              <span className="text-xl"></span>
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC04] text-xs font-bold text-white">
                G
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">{label}</h2>
            <p className="text-xs text-gray-500">
              MboaEats · {total.toLocaleString("fr-FR")} FCFA
            </p>
          </div>
        </div>

        {/* Body */}
        {status === "pending" && (
          <div className="mt-6">
            <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-2xl bg-gray-50">
              <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
            </div>
            <p className="mt-4 text-center text-sm font-semibold text-gray-900">
              Paiement en cours…
            </p>
            <p className="mt-1 text-center text-xs text-gray-500">
              Confirme la transaction sur ton appareil. La page se met à jour automatiquement dès la confirmation du webhook.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-400">
              <ShieldCheck className="h-3 w-3" /> Connexion sécurisée · 3-D Secure
            </div>
          </div>
        )}

        {status === "succeeded" && (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white animate-scale-in">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <p className="mt-4 text-lg font-bold text-gray-900">Paiement confirmé</p>
            <p className="mt-1 text-sm text-gray-500">
              {total.toLocaleString("fr-FR")} FCFA débités via {label}. Redirection vers le suivi…
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <p className="mt-4 text-lg font-bold text-gray-900">Paiement refusé</p>
            <p className="mt-1 text-sm text-gray-500">
              {errorMessage ?? "La transaction n'a pas abouti. Réessaie ou choisis une autre méthode."}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="h-11 w-full rounded-2xl bg-black text-sm font-semibold text-white active:scale-[0.98]"
                >
                  Réessayer
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-11 w-full rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 active:scale-[0.98]"
              >
                Choisir une autre méthode
              </button>
            </div>
          </div>
        )}

        {reference && status !== "succeeded" && (
          <p className="mt-4 text-center text-[11px] text-gray-400">Réf. {reference}</p>
        )}
      </div>
    </div>
  );
}
