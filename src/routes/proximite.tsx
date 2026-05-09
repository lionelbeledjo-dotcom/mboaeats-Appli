import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Star, Clock } from "lucide-react";
import { restaurants } from "@/data/restaurants";

export const Route = createFileRoute("/proximite")({
  component: ProximitePage,
  staleTime: Infinity,
  head: () => ({
    meta: [
      { title: "À proximité — MboaEats" },
      { name: "description", content: "Restaurants proches de vous à Douala et Yaoundé." },
    ],
  }),
});

function ProximitePage() {
  const router = useRouter();
  // Tri : Douala en priorité (ville par défaut), puis Yaoundé. ETA croissant.
  const list = [...restaurants].sort((a, b) => {
    if (a.city !== b.city) return a.city === "Douala" ? -1 : 1;
    return parseInt(a.eta) - parseInt(b.eta);
  });

  const handleBack = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={handleBack}
            aria-label="Retour"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">📍</span>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-tight truncate">À proximité</h1>
              <p className="text-[11px] text-muted-foreground">{list.length} restaurants</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-12 pt-4 space-y-3">
        {list.map((r) => (
          <Link
            key={r.id}
            to="/restaurants/$restoId"
            params={{ restoId: r.id }}
            preload="intent"
            className="flex gap-3 rounded-2xl border border-border bg-card p-3 active:scale-[0.99] transition-transform shadow-card"
          >
            <img
              src={r.cover}
              alt={r.name}
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="truncate font-display text-sm font-bold">{r.name}</h2>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.tagline.split("—")[0].trim()}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {r.rating}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {r.eta}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {r.neighborhood}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
