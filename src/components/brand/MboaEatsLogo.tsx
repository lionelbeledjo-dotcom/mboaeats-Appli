import { cn } from "@/lib/utils";
import { DeliveryBadge } from "@/components/brand/DeliveryBadge";

interface MboaEatsLogoProps {
  /** Visual size preset */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show outer green rounded container (default: true) */
  withContainer?: boolean;
  className?: string;
}

const TEXT_SIZES = {
  sm: "text-[28px] sm:text-[32px]",
  md: "text-[40px] sm:text-[48px]",
  lg: "text-[40px] sm:text-[56px]",
  xl: "text-[64px] sm:text-[88px]",
} as const;

const PADDING_SIZES = {
  sm: "px-4 py-3 sm:px-5 sm:py-4",
  md: "px-5 py-4 sm:px-6 sm:py-5",
  lg: "px-6 py-5 sm:px-8 sm:py-6",
  xl: "px-8 py-6 sm:px-12 sm:py-8",
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
    <div className="flex flex-col items-start">
      <DeliveryBadge className="mb-2 ml-[2px] sm:ml-[3px]" />
      {wordmark}
    </div>
  );

  if (!withContainer) {
    // Variant without green background (for use over existing dark surfaces)
    return <div className={className}>{inner}</div>;
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#0A8F4E] shadow-[0_12px_32px_-14px_rgba(6,193,103,0.55)] sm:rounded-3xl",
        PADDING_SIZES[size],
        className,
      )}
    >
      {inner}
    </div>
  );
}

export default MboaEatsLogo;
