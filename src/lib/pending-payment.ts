// Persistance d'un paiement en cours pour permettre une redirection vers /suivi
// même si l'utilisateur quitte la page Checkout pendant la transaction.

const KEY = "mboaeats:pending_payment";

export type PendingPayment = {
  reference: string;
  orderId: string | null;
  total: number;
  startedAt: number;
};

export function setPendingPayment(p: Omit<PendingPayment, "startedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingPayment = { ...p, startedAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("mboaeats:pending-payment-changed"));
  } catch { /* quota / SSR */ }
}

export function updatePendingPayment(patch: Partial<Omit<PendingPayment, "startedAt">>) {
  const cur = getPendingPayment();
  if (!cur) return;
  setPendingPayment({ ...cur, ...patch });
}

export function getPendingPayment(): PendingPayment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPayment;
    // Expire après 30 minutes — au-delà la transaction est considérée caduque.
    if (Date.now() - parsed.startedAt > 30 * 60 * 1000) {
      clearPendingPayment();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("mboaeats:pending-payment-changed"));
  } catch { /* SSR */ }
}
