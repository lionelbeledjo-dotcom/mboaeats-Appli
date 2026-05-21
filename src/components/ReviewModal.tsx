import { useEffect, useState } from "react";
import { Star, X, Loader2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitOrderReview, getOrderReview } from "@/server/social.functions";

type Props = {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  driverId: string | null;
  driverName?: string | null;
  driverAvatar?: string | null;
  open: boolean;
  onClose: () => void;
};

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = (hover || value) >= i;
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
            aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
            className="p-0.5"
          >
            <Star
              className={`h-8 w-8 transition ${
                filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function ReviewModal({
  orderId,
  restaurantId,
  restaurantName,
  driverId,
  driverName,
  driverAvatar,
  open,
  onClose,
}: Props) {
  const submit = useServerFn(submitOrderReview);
  const fetchExisting = useServerFn(getOrderReview);
  const [restoRating, setRestoRating] = useState(0);
  const [restoComment, setRestoComment] = useState("");
  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Check if review already exists for this order
  useEffect(() => {
    if (!open) return;
    fetchExisting({ data: { orderId } })
      .then((r) => {
        if (r.exists) setAlreadyDone(true);
      })
      .catch(() => {});
  }, [open, orderId, fetchExisting]);

  if (!open) return null;

  const canSubmit = restoRating > 0 || (driverId && driverRating > 0);

  const handleSkip = () => {
    localStorage.setItem(`review_dismissed_${orderId}`, "1");
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Choisissez au moins une note");
      return;
    }
    setLoading(true);
    try {
      await submit({
        data: {
          orderId,
          restaurantRating: restoRating || undefined,
          restaurantComment: restoComment.trim() || undefined,
          driverRating: driverId && driverRating ? driverRating : undefined,
          driverComment: driverId && driverComment.trim() ? driverComment.trim() : undefined,
        },
      });
      localStorage.setItem(`review_dismissed_${orderId}`, "1");
      toast.success("Merci pour votre retour 🌟");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Impossible d'envoyer l'avis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={handleSkip}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#1A1A1A]">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            Comment s'est passée votre commande ?
          </h3>
          <button
            type="button"
            onClick={handleSkip}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F4F4]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {alreadyDone ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700">
            <Check className="h-4 w-4" /> Vous avez déjà laissé un avis sur cette commande. Merci !
          </div>
        ) : (
          <>
            {/* Restaurant */}
            <section className="mt-4 rounded-2xl border border-border/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F0E8] text-lg">
                  🍽️
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                    Restaurant
                  </p>
                  <p className="truncate text-sm font-bold text-[#1A1A1A]">
                    {restaurantName}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-center">
                <Stars value={restoRating} onChange={setRestoRating} />
              </div>
              <textarea
                value={restoComment}
                onChange={(e) => setRestoComment(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="Un commentaire ? (facultatif)"
                className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#06C167]"
              />
            </section>

            {/* Driver */}
            {driverId && (
              <section className="mt-3 rounded-2xl border border-border/60 p-4">
                <div className="flex items-center gap-3">
                  {driverAvatar ? (
                    <img
                      src={driverAvatar}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C167] text-sm font-bold text-white">
                      {(driverName ?? "L").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#888]">
                      Livreur
                    </p>
                    <p className="truncate text-sm font-bold text-[#1A1A1A]">
                      {driverName ?? "Votre livreur"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-center">
                  <Stars value={driverRating} onChange={setDriverRating} />
                </div>
                <textarea
                  value={driverComment}
                  onChange={(e) => setDriverComment(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder="Un commentaire ? (facultatif)"
                  className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#06C167]"
                />
              </section>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 rounded-xl border border-border bg-white py-3 text-sm font-semibold text-[#555]"
              >
                Plus tard
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#06C167] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
