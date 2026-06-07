import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isFavorite, toggleFavorite } from "@/lib/social.functions";

export function FavoriteButton({
  restaurantId,
  className,
}: {
  restaurantId: string;
  className?: string;
}) {
  const isFavFn = useServerFn(isFavorite);
  const toggleFn = useServerFn(toggleFavorite);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (!data.user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      try {
        const r = await isFavFn({ data: { restaurantId } });
        if (alive) setFavorited(r.favorited);
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [restaurantId, isFavFn]);

  const onClick = async () => {
    if (!authed) {
      toast.info("Connectez-vous pour ajouter en favori");
      return;
    }
    setLoading(true);
    try {
      const r = await toggleFn({ data: { restaurantId } });
      setFavorited(r.favorited);
      toast.success(r.favorited ? "Ajouté aux favoris" : "Retiré des favoris");
    } catch (e) {
      toast.error((e as Error).message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={favorited}
      className={
        className ??
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-xl transition hover:bg-black/60 active:scale-95"
      }
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Heart
          className={`h-5 w-5 transition ${favorited ? "fill-primary text-primary" : ""}`}
        />
      )}
    </button>
  );
}
