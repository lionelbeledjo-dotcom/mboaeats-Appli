import { cn } from "@/lib/utils";
import { DeliveryBadge } from "@/components/brand/DeliveryBadge";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";
type LogoAlign = "start" | "center" | "end";
type LogoVariant = "filled" | "outline" | "ghost" | "plain";
type BadgeSize = "sm" | "md";

interface MboaEatsLogoProps {
  /** Wordmark size preset */
  size?: LogoSize;
  /** Horizontal alignment of the badge + wordmark stack */
  align?: LogoAlign;
  /**
   * Visual variant:
   * - filled  : green container (default, used on splash & connexion)
   * - outline : transparent bg with brand-green border
   * - ghost   : transparent bg, no border, no padding container
   * - plain   : alias of ghost (kept for clarity at call sites)
   */
  variant?: LogoVariant;
  /** Override badge size (defaults: sm logo→sm badge, otherwise md) */
  badgeSize?: BadgeSize;
  /** Hide the "Livraison Cameroun" badge entirely */
  showBadge?: boolean;
  /** Override badge label */
  badgeLabel?: string;
  /**
   * @deprecated Use `variant` instead. `withContainer={false}` ≡ variant="ghost".
   */
  withContainer?: boolean;
  /** Active l'animation d'entrée (fade-in + scale + révélation séquentielle). À utiliser uniquement sur le header client. */
  animate?: boolean;
  className?: string;
}

// Tailles fluides : clamp() garantit la lisibilité jusqu'à 320px sans débordement
const TEXT_SIZES: Record<LogoSize, string> = {
  xs: "text-[22px]",
  sm: "text-[clamp(22px,7vw,32px)]",
  md: "text-[clamp(28px,8vw,48px)]",
  lg: "text-[clamp(30px,9vw,56px)]",
  xl: "text-[clamp(44px,12vw,88px)]",
};

const PADDING_SIZES: Record<LogoSize, string> = {
  xs: "px-2 py-1.5",
  sm: "px-3 py-2.5 sm:px-5 sm:py-4",
  md: "px-4 py-3 sm:px-6 sm:py-5",
  lg: "px-4 py-4 sm:px-8 sm:py-6",
  xl: "px-5 py-5 sm:px-12 sm:py-8",
};

const ALIGN_ITEMS: Record<LogoAlign, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

const CONTAINER_ALIGN: Record<LogoAlign, string> = {
  start: "mr-auto",
  center: "mx-auto",
  end: "ml-auto",
};

/**
 * MboaEats brand lockup: badge "Livraison Cameroun" + wordmark.
 * Single source of truth — réutilisable sur splash, connexion, inscription, header, footer…
 */
export function MboaEatsLogo({
  size = "lg",
  align = "start",
  variant,
  badgeSize,
  showBadge = true,
  badgeLabel,
  withContainer,
  animate = false,
  className,
}: MboaEatsLogoProps) {
  // Backward compat: withContainer={false} → ghost
  const resolvedVariant: LogoVariant =
    variant ?? (withContainer === false ? "ghost" : "filled");

  const resolvedBadgeSize: BadgeSize = badgeSize ?? (size === "xs" || size === "sm" ? "sm" : "md");

  const wordmarkBaseColor =
    resolvedVariant === "filled"
      ? "text-white"
      : resolvedVariant === "ghost" || resolvedVariant === "plain"
        ? "text-white dark:text-white"
        : "text-foreground";

  const wordmark = (
    <h2
      aria-label="MboaEats"
      className={cn(
        "font-black leading-none tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.20)]",
        TEXT_SIZES[size],
      )}
    >
      <span className={wordmarkBaseColor}>Mboa</span>
      <span className="text-brand-cm-green">Eats</span>
    </h2>
  );

  const inner = (
    <div className={cn("flex min-w-0 flex-col", ALIGN_ITEMS[align])}>
      {showBadge && (
        <DeliveryBadge size={resolvedBadgeSize} label={badgeLabel} className="mb-2" />
      )}
      {wordmark}
    </div>
  );

  if (resolvedVariant === "ghost" || resolvedVariant === "plain") {
    return (
      <div className={cn("inline-flex max-w-full", CONTAINER_ALIGN[align], className)}>
        {inner}
      </div>
    );
  }

  const variantClasses =
    resolvedVariant === "outline"
      ? "border-2 border-brand-cm-green bg-transparent"
      : "bg-[#0A8F4E] shadow-[0_12px_32px_-14px_rgba(6,193,103,0.55)]";

  return (
    <div
      className={cn(
        "inline-flex max-w-full rounded-2xl sm:rounded-3xl",
        variantClasses,
        PADDING_SIZES[size],
        CONTAINER_ALIGN[align],
        className,
      )}
    >
      {inner}
    </div>
  );
}

export default MboaEatsLogo;
