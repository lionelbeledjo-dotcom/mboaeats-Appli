import { useEffect, useState } from "react";

type Wallet = "apple" | "google" | null;

/**
 * Détecte le wallet natif disponible sur l'appareil.
 * - Apple Pay : Safari iOS/macOS via window.ApplePaySession.canMakePayments()
 * - Google Pay : Chrome/Android via window.PaymentRequest (heuristique UA)
 */
function detectWallet(): Wallet {
  if (typeof window === "undefined") return null;
  try {
    const w = window as unknown as {
      ApplePaySession?: { canMakePayments?: () => boolean };
      PaymentRequest?: unknown;
    };
    if (w.ApplePaySession && typeof w.ApplePaySession.canMakePayments === "function") {
      try {
        if (w.ApplePaySession.canMakePayments()) return "apple";
      } catch {
        /* ignore */
      }
    }
    const ua = navigator.userAgent || "";
    const isAndroidChrome = /Android/i.test(ua) && /Chrome/i.test(ua);
    if (isAndroidChrome && w.PaymentRequest) return "google";
  } catch {
    /* ignore */
  }
  return null;
}

export function WalletPayButton({
  total,
  disabled,
  onPay,
}: {
  total: number;
  disabled?: boolean;
  onPay: (wallet: "apple" | "google") => void;
}) {
  const [wallet, setWallet] = useState<Wallet>(null);

  useEffect(() => {
    setWallet(detectWallet());
  }, []);

  if (!wallet) return null;

  const isApple = wallet === "apple";
  const label = isApple ? "Apple Pay" : "Google Pay";
  const glyph = isApple ? "" : "G";

  return (
    <button
      type="button"
      onClick={() => onPay(wallet)}
      disabled={disabled}
      aria-label={`Payer ${total.toLocaleString("fr-FR")} FCFA avec ${label}`}
      className={`relative flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
        isApple
          ? "bg-black text-white shadow-[0_10px_28px_-12px_rgba(0,0,0,0.55)]"
          : "border border-gray-200 bg-white text-gray-900 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]"
      }`}
    >
      {isApple ? (
        <>
          <span aria-hidden className="text-xl leading-none"></span>
          <span className="text-[15px]">Pay</span>
        </>
      ) : (
        <>
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC04] text-[11px] font-bold text-white"
          >
            {glyph}
          </span>
          <span className="text-[15px]">Pay</span>
        </>
      )}
      <span className={`text-[13px] font-bold ${isApple ? "text-white/70" : "text-gray-500"}`}>
        · {total.toLocaleString("fr-FR")} FCFA
      </span>
    </button>
  );
}
