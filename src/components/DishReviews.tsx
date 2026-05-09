import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function DishReviews({
  dishId,
  restaurantId,
}: {
  dishId: string;
  restaurantId: string;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dish_reviews")
      .select("id,user_id,rating,comment,created_at")
      .eq("dish_id", dishId)
      .order("created_at", { ascending: false });
    if (!error && data) setReviews(data as Review[]);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishId]);

  const myReview = userId ? reviews.find((r) => r.user_id === userId) : null;
  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const submit = async () => {
    if (!userId) {
      toast.error("Connectez-vous pour laisser un avis");
      return;
    }
    if (rating < 1) {
      toast.error("Choisissez une note");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("dish_reviews").upsert(
      {
        dish_id: dishId,
        restaurant_id: restaurantId,
        user_id: userId,
        rating,
        comment: comment.trim() || null,
      },
      { onConflict: "dish_id,user_id" },
    );
    setSubmitting(false);
    if (error) {
      toast.error("Échec de l'envoi", { description: error.message });
      return;
    }
    toast.success("Merci pour votre avis !");
    setComment("");
    setRating(0);
    load();
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Avis ({reviews.length})
        </h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {avg.toFixed(1)}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="mb-2 text-xs font-semibold text-foreground">
          {myReview ? "Modifier votre avis" : "Laisser un avis"}
        </p>
        <div className="mb-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating || myReview?.rating || 0) >= n;
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
                  className={`h-6 w-6 transition ${
                    active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                  }`}
                />
              </button>
            );
          })}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder={
            myReview?.comment ?? "Partagez votre expérience sur ce plat…"
          }
          className="w-full resize-none rounded-xl border border-border/60 bg-background p-3 text-sm text-foreground outline-none focus:border-[#06C167]"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {comment.length}/500
          </span>
          <button
            type="button"
            disabled={submitting || !userId}
            onClick={submit}
            className="rounded-full bg-[#06C167] px-5 py-2 text-xs font-bold text-white shadow-[0_8px_20px_-8px_rgba(6,193,103,0.7)] transition active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Envoi…" : myReview ? "Mettre à jour" : "Publier"}
          </button>
        </div>
        {!userId && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Connectez-vous pour publier un avis.
          </p>
        )}
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement des avis…</p>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun avis pour ce plat. Soyez le premier !
          </p>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border/60 bg-card p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
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
                <span className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm leading-relaxed text-foreground">
                  {r.comment}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
