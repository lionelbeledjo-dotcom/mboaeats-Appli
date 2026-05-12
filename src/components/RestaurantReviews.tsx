import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string;
};

const STORAGE_PREFIX = "mboa_resto_reviews_";

function loadReviews(restoId: string): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + restoId);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

const REVIEWS_EVENT = "mboa:reviews-updated";

function saveReviews(restoId: string, list: Review[]) {
  localStorage.setItem(STORAGE_PREFIX + restoId, JSON.stringify(list));
  // Notify other components in the same tab (storage event only fires cross-tab)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(REVIEWS_EVENT, { detail: { restoId } }),
    );
  }
}

export function RestaurantReviews({
  restoId,
  baseRating,
}: {
  restoId: string;
  baseRating?: number;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Initial load + live sync (cross-tab via 'storage', same-tab via custom event)
  useEffect(() => {
    setReviews(loadReviews(restoId));

    const refresh = () => setReviews(loadReviews(restoId));

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_PREFIX + restoId) refresh();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ restoId: string }>).detail;
      if (!detail || detail.restoId === restoId) refresh();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(REVIEWS_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(REVIEWS_EVENT, onCustom);
    };
  }, [restoId]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return baseRating ?? 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews, baseRating]);

  const submit = () => {
    if (rating < 1) {
      toast.error("Choisissez une note de 1 à 5 étoiles");
      return;
    }
    if (!comment.trim()) {
      toast.error("Ajoutez un commentaire");
      return;
    }
    setSubmitting(true);
    const next: Review = {
      id: crypto.randomUUID(),
      author: author.trim() || "Client MboaEats",
      rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };
    const list = [next, ...reviews];
    setReviews(list);
    saveReviews(restoId, list);
    setHighlightId(next.id);
    setTimeout(() => setHighlightId((id) => (id === next.id ? null : id)), 2500);
    setRating(0);
    setComment("");
    setAuthor("");
    setSubmitting(false);
    toast.success("Merci pour votre avis ! 🎉");
  };

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">
          Avis clients
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            ({reviews.length})
          </span>
        </h2>
        {avg > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {avg.toFixed(1)}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold">Laisser un avis</p>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value.slice(0, 40))}
          placeholder="Votre prénom (optionnel)"
          className="mb-3 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-[#06C167]"
        />
        <div className="mb-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                className="p-0.5"
              >
                <Star
                  className={`h-7 w-7 transition ${
                    active
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Partagez votre expérience…"
          className="w-full resize-none rounded-xl border border-border/60 bg-background p-3 text-sm outline-none focus:border-[#06C167]"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {comment.length}/500
          </span>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="rounded-full bg-[#06C167] px-5 py-2 text-xs font-bold text-white shadow-[0_8px_20px_-8px_rgba(6,193,103,0.7)] transition active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Envoi…" : "Publier mon avis"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-4 text-center text-sm text-muted-foreground">
            Aucun avis pour le moment. Soyez le premier !
          </p>
        ) : (
          reviews.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-border/60 bg-card p-4"
            >
              <header className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{r.author}</p>
                  <div className="mt-0.5 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${
                          r.rating >= n
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </header>
              <p className="text-sm leading-relaxed text-foreground">
                {r.comment}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
