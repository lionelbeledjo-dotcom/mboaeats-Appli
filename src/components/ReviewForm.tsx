import { useEffect, useState } from "react";
import { Star, Loader2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitReview } from "@/lib/social.functions";

export function ReviewForm({
  restaurantId,
  orderId,
}: {
  restaurantId: string;
  orderId?: string;
}) {
  const submit = useServerFn(submitReview);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Stocker localement pour ne pas re-proposer
  useEffect(() => {
    if (orderId && localStorage.getItem(`review_${orderId}`)) setDone(true);
  }, [orderId]);

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
        <Check className="h-4 w-4" /> Merci pour votre avis !
      </div>
    );
  }

  const onSubmit = async () => {
    if (rating < 1) {
      toast.error("Sélectionnez une note de 1 à 5 étoiles");
      return;
    }
    setLoading(true);
    try {
      await submit({
        data: {
          restaurantId,
          orderId,
          rating,
          comment: comment.trim() || undefined,
        },
      });
      if (orderId) localStorage.setItem(`review_${orderId}`, "1");
      setDone(true);
      toast.success("Avis envoyé !");
    } catch (e) {
      toast.error((e as Error).message ?? "Impossible d'envoyer l'avis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <h3 className="font-display text-base font-bold">Notez votre expérience</h3>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = (hover || rating) >= i;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
              className="p-1"
            >
              <Star className={`h-7 w-7 transition ${filled ? "fill-gold text-gold" : "text-muted-foreground"}`} />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        placeholder="Un commentaire ? (optionnel)"
        rows={3}
        className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
      />
      <button
        onClick={onSubmit}
        disabled={loading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer mon avis"}
      </button>
    </div>
  );
}
