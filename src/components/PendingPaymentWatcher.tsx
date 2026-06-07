import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pollPaymentStatus } from "@/lib/payments.functions";
import { markOrderPaid } from "@/lib/marketplace.functions";
import {
  clearPendingPayment,
  getPendingPayment,
  type PendingPayment,
} from "@/lib/pending-payment";

/**
 * Surveille un paiement en cours (Apple Pay / Google Pay / Mobile Money)
 * stocké en localStorage. Dès que le webhook confirme le paiement,
 * redirige automatiquement vers l'écran de suivi — même si l'utilisateur
 * a quitté la page Checkout pendant la transaction.
 */
export function PendingPaymentWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const markPaid = useServerFn(markOrderPaid);
  const poll = useServerFn(pollPaymentStatus);
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const handledRef = useRef<string | null>(null);

  // Hydrate + écoute les changements (autres onglets / autres composants)
  useEffect(() => {
    setPending(getPendingPayment());
    const refresh = () => setPending(getPendingPayment());
    window.addEventListener("storage", refresh);
    window.addEventListener("mboaeats:pending-payment-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("mboaeats:pending-payment-changed", refresh);
    };
  }, []);

  const onSuccess = async (p: PendingPayment) => {
    if (handledRef.current === p.reference) return;
    handledRef.current = p.reference;
    try {
      if (p.orderId) {
        await markPaid({
          data: { order_id: p.orderId, payment_reference: p.reference },
        }).catch(() => undefined);
      }
    } finally {
      clearPendingPayment();
      toast.success("Paiement confirmé", {
        description: "Redirection vers le suivi de votre commande…",
      });
      if (p.orderId) {
        navigate({ to: "/suivi/$orderId", params: { orderId: p.orderId } });
      } else {
        navigate({ to: "/suivi" });
      }
    }
  };

  // Realtime + poll fallback
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;

    // 1) Vérifie immédiatement (cas où le webhook a déjà répondu)
    void (async () => {
      try {
        const r = await poll({ data: { reference: pending.reference } });
        if (cancelled) return;
        if (r.status === "succeeded") return onSuccess(pending);
        if (r.status === "failed") {
          clearPendingPayment();
          toast.error("Paiement refusé", { description: "La transaction n'a pas abouti." });
        }
      } catch { /* ignore */ }
    })();

    // 2) Realtime sur la table payments
    const channel = supabase
      .channel(`pending-pay-${pending.reference}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `reference=eq.${pending.reference}` },
        (payload) => {
          const s = (payload.new as { status?: string })?.status;
          if (s === "succeeded") void onSuccess(pending);
          else if (s === "failed") {
            clearPendingPayment();
            toast.error("Paiement refusé", { description: "La transaction n'a pas abouti." });
          }
        },
      )
      .subscribe();

    // 3) Poll toutes les 8 s en filet de sécurité (réseau Realtime instable)
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const r = await poll({ data: { reference: pending.reference } });
        if (r.status === "succeeded") void onSuccess(pending);
        else if (r.status === "failed") {
          clearPendingPayment();
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [pending?.reference]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pending) return null;

  // N'affiche pas le mini-banner sur le checkout (overlay dédié) ni sur le suivi
  const path = location.pathname;
  if (path.startsWith("/checkout") || path.startsWith("/suivi")) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (pending.orderId) navigate({ to: "/suivi/$orderId", params: { orderId: pending.orderId } });
        else navigate({ to: "/checkout" });
      }}
      className="fixed left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/90 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur animate-fade-in"
      style={{ bottom: "calc(96px + env(safe-area-inset-bottom))" }}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Paiement en cours · {pending.total.toLocaleString("fr-FR")} FCFA
    </button>
  );
}
