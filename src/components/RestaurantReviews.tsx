import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listReviews } from "@/server/social.functions";

type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function RestaurantReviews({
  restoId,
  baseRating,
}: {
  restoId: string;
  baseRating?: number;
}) {
  const fetchReviews = useServerFn(listReviews);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState<number>(baseRating ?? 0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchReviews({ data: { restaurantId: restoId } })
      .then((res) => {
        if (!active) return;
        setReviews(res.reviews);
        setAvg(res.avg || baseRating || 0);
        setCount(res.count);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [restoId, fetchReviews, baseRating]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">
          Avis clients
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            ({count})
          </span>
        </h2>
        {avg > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {avg.toFixed(1)}
          </span>
        )}
      </div>

      <p className="mb-4 rounded-2xl border border-dashed border-border/60 bg-card/50 p-3 text-center text-xs text-muted-foreground">
        💡 Seuls les clients ayant reçu une commande peuvent laisser un avis.
      </p>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-4 text-center text-sm text-muted-foreground">
            Aucun avis pour le moment. Soyez le premier après votre prochaine commande !
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
              {r.comment && (
                <p className="text-sm leading-relaxed text-foreground">{r.comment}</p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
