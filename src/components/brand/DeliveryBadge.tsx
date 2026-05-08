import { cn } from "@/lib/utils";

interface DeliveryBadgeProps {
  /** Override label if needed (defaults to "Livraison Cameroun") */
  label?: string;
  /** Country ISO code (lowercase) for the circle-flag icon */
  countryIso?: string;
  /** Visual size — default matches the connexion logo */
  size?: "sm" | "md";
  className?: string;
}

/**
 * MboaEats brand "Livraison" pill badge.
 * Uses design-system tokens: bg-brand-cm-green, text-brand-cm-green-fg,
 * shadow-badge, and standardized rounded-full + tracking.
 */
export function DeliveryBadge({
  label = "Livraison Cameroun",
  countryIso = "cm",
  size = "md",
  className,
}: DeliveryBadgeProps) {
  const isSm = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center self-start rounded-full bg-brand-cm-green text-brand-cm-green-fg font-extrabold uppercase leading-none shadow-badge",
        isSm
          ? "gap-1.5 px-2.5 py-[3px] text-[9px] tracking-[0.14em]"
          : "gap-1.5 px-2.5 py-[3px] text-[9px] tracking-[0.14em] sm:gap-2 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.16em]",
        className,
      )}
    >
      <img
        src={`https://hatscripts.github.io/circle-flags/flags/${countryIso}.svg`}
        alt=""
        aria-hidden="true"
        width={16}
        height={16}
        className={cn(
          "shrink-0 rounded-full ring-1 ring-white/40",
          isSm ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-4 sm:w-4",
        )}
      />
      <span>{label}</span>
    </span>
  );
}

export default DeliveryBadge;
