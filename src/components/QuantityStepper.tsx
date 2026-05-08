import { Minus, Plus } from "lucide-react";

type Props = {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  size?: "sm" | "md";
  ariaLabel?: string;
};

export function QuantityStepper({ qty, onInc, onDec, size = "md", ariaLabel = "Quantité" }: Props) {
  const dim = size === "sm" ? "h-8" : "h-10";
  const btn = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex ${dim} select-none items-center overflow-hidden rounded-full border border-primary/30 bg-background shadow-sm`}
    >
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDec(); }}
        aria-label="Diminuer"
        className={`${btn} flex items-center justify-center text-primary transition-colors hover:bg-primary/10 active:scale-95`}
      >
        <Minus className="h-4 w-4" strokeWidth={2.6} />
      </button>
      <span
        key={qty}
        className="min-w-7 text-center font-display text-sm font-bold tabular-nums text-foreground animate-scale-in"
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInc(); }}
        aria-label="Augmenter"
        className={`${btn} flex items-center justify-center bg-gradient-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95`}
      >
        <Plus className="h-4 w-4" strokeWidth={2.8} />
      </button>
    </div>
  );
}

export default QuantityStepper;
