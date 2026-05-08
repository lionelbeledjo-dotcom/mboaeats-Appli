import { cn } from "@/lib/utils";
import { DeliveryBadge } from "@/components/brand/DeliveryBadge";

interface MboaEatsLogoProps {
  /** Visual size preset */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show outer green rounded container (default: true) */
  withContainer?: boolean;
  className?: string;
}

// Tailles fluides : clamp() garantit la lisibilité jusqu'à 320px sans débordement
const TEXT_SIZES = {
  sm: "text-[clamp(22px,7vw,32px)]",
  md: "text-[clamp(28px,8vw,48px)]",
  lg: "text-[clamp(30px,9vw,56px)]",
  xl: "text-[clamp(44px,12vw,88px)]",
} as const;

const PADDING_SIZES = {
  sm: "px-3 py-2.5 sm:px-5 sm:py-4",
  md: "px-4 py-3 sm:px-6 sm:py-5",
  lg: "px-4 py-4 sm:px-8 sm:py-6",
  xl: "px-5 py-5 sm:px-12 sm:py-8",
} as const;

/**
 * MboaEats brand lockup: badge "Livraison Cameroun" + wordmark.
 * Single source of truth — used on splash, connexion, inscription, etc.
 */
export function MboaEatsLogo({
  size = "lg",
  withContainer = true,
  className,
}: MboaEatsLogoProps) {
  const wordmark = (
    <h2
      aria-label="MboaEats"
      className={cn(
        "font-black leading-none tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.20)]",
        TEXT_SIZES[size],
      )}
    >
      <span className="text-white">Mboa</span>
      <span className="text-brand-cm-green">Eats</span>
    </h2>
  );

  const inner = (
    <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
      <DeliveryBadge className="mb-2" />
      {wordmark}
    </div>
  );

  if (!withContainer) {
    return <div className={cn("max-w-full", className)}>{inner}</div>;
  }

  return (
    <div
      className={cn(
        "mx-auto inline-flex max-w-full rounded-2xl bg-[#0A8F4E] shadow-[0_12px_32px_-14px_rgba(6,193,103,0.55)] sm:rounded-3xl",
        PADDING_SIZES[size],
        className,
      )}
    >
      {inner}
    </div>
  );
}

export default MboaEatsLogo;
