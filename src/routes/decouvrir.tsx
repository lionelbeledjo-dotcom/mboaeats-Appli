import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, Clock, Search, MapPin, Flame, UtensilsCrossed } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listRestaurants } from "@/server/marketplace.functions";
import { CardSkeleton, EmptyState } from "@/components/ui/feedback";

export const Route = createFileRoute("/decouvrir")({
  component: Decouvrir,
  head: () => ({
    meta: [
      { title: "Découvrir les restos · MboaEats" },
      {
        name: "description",
        content:
          "Tous les restaurants partenaires MboaEats à Douala et Yaoundé, en temps réel.",
      },
    ],
  }),
});

type Resto = {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  city: string;
  neighborhood: string | null;
  image_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  eta_min: number | null;
  eta_max: number | null;
  delivery_fee: number | null;
  is_open: boolean | null;
};

function Decouvrir() {
  const list = useServerFn(listRestaurants);
  const [restos, setRestos] = useState<Resto[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    list({ data: { city: city || undefined, search: search || undefined, limit: 30 } })
      .then((r) => setRestos(r.restaurants as Resto[]))
      .finally(() => setLoading(false));
  }, [list, city, search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass border-b border-border/40">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
          <h1 className="font-display font-bold">Découvrir</h1>
          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            Live
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface/80 px-3 py-2 shadow-card">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un restaurant…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["", "Douala", "Yaoundé", "Bafoussam"].map((c) => {
            const active = c === city;
            return (
              <button
                key={c || "all"}
                onClick={() => setCity(c)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {c || "Toutes villes"}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-border bg-surface/40"
              />
            ))}

          {!loading && restos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aucun restaurant trouvé.
            </div>
          )}

          {!loading &&
            restos.map((r) => (
              <Link
                key={r.id}
                to="/r/$slug"
                params={{ slug: r.slug }}
                preload="intent"
                className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-transform active:scale-[0.99]"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                      <Flame className="h-10 w-10 text-primary" />
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
                      r.is_open
                        ? "bg-emerald-500/90 text-white"
                        : "bg-background/80 text-muted-foreground"
                    }`}
                  >
                    {r.is_open ? "● Ouvert" : "Fermé"}
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-semibold">
                        {r.name}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.cuisine}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-md bg-gold/10 px-1.5 py-0.5 text-xs font-semibold text-gold">
                      <Star className="h-3 w-3 fill-current" />
                      {Number(r.rating ?? 4.5).toFixed(1)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {r.eta_min ?? 20}-
                      {r.eta_max ?? 40} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {r.neighborhood ?? r.city}
                    </span>
                    <span className="font-semibold text-foreground">
                      Livraison {(r.delivery_fee ?? 0).toLocaleString("fr-FR")} F
                    </span>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </main>
    </div>
  );
}
