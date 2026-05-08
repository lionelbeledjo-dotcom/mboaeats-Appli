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
        // Base — identique mobile & desktop : alignement vertical centré, font, ombre, radius
        "inline-flex items-center self-start rounded-full bg-brand-cm-green text-brand-cm-green-fg font-extrabold uppercase leading-none shadow-badge",
        // Taille responsive : padding & tracking proportionnels à la font-size
        isSm
          ? "gap-1.5 px-2.5 py-1 text-[9px] tracking-[0.14em]"
          : "gap-1.5 px-2.5 py-1 text-[9px] tracking-[0.14em] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-[0.16em]",
        className,
      )}
    >
      <img
        src={`https://hatscripts.github.io/circle-flags/flags/${countryIso}.svg`}
        alt=""
        aria-hidden="true"
        width={14}
        height={14}
        className={cn(
          // Flag dimensionné pour matcher la cap-height du texte (≈ 1.3× font-size)
          "shrink-0 rounded-full ring-1 ring-white/50",
          isSm ? "h-3 w-3" : "h-3 w-3 sm:h-3.5 sm:w-3.5",
        )}
      />
      <span className="translate-y-px">{label}</span>
    </span>
  );
}

export default DeliveryBadge;
