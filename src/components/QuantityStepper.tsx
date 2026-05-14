import { memo } from "react";
import { Minus, Plus } from "lucide-react";

type Props = {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  size?: "sm" | "md";
  ariaLabel?: string;
};

function QuantityStepperImpl({ qty, onInc, onDec, size = "md", ariaLabel = "Quantité" }: Props) {
  const isSm = size === "sm";
  const wrap = isSm ? "h-10 gap-1.5 p-1" : "h-12 gap-2 p-1.5";
  const btn = isSm ? "h-8 w-8" : "h-9 w-9";
  const num = isSm ? "min-w-[1.75rem] text-sm" : "min-w-[2.25rem] text-base";

  const handleDec = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDec();
  };
  const handleInc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onInc();
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex ${wrap} select-none items-center rounded-2xl border border-gray-200 bg-white shadow-sm`}
    >
      <button
        type="button"
        onClick={handleDec}
        aria-label="Diminuer"
        className={`${btn} flex items-center justify-center rounded-xl bg-[#06C167]/10 text-[#06C167] transition-transform active:scale-90`}
      >
        <Minus className="h-4 w-4" strokeWidth={2.8} />
      </button>
      <span
        key={qty}
        className={`${num} px-1 text-center font-display font-bold tabular-nums text-foreground animate-scale-in`}
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={handleInc}
        aria-label="Augmenter"
        className={`${btn} flex items-center justify-center rounded-xl bg-[#06C167] text-white shadow-sm transition-transform active:scale-90`}
      >
        <Plus className="h-4 w-4" strokeWidth={2.8} />
      </button>
    </div>
  );
}

export const QuantityStepper = memo(QuantityStepperImpl);
export default QuantityStepper;
