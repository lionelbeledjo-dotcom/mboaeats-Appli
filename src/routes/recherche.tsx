import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, TrendingUp, Clock, X } from "lucide-react";
import { restaurants } from "@/data/restaurants";

export const Route = createFileRoute("/recherche")({
  head: () => ({
    meta: [
      { title: "Recherche — MboaEats" },
      { name: "description", content: "Trouvez vos plats et restaurants préférés au Cameroun." },
    ],
  }),
  component: RecherchePage,
});

const trending = ["Ndolé royal", "Poulet DG", "Eru + Garri", "Poisson braisé", "Soya bœuf", "Bobolo"];
const recent = ["Chez Mama Douala", "Suya"];

function RecherchePage() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    const dishes: { resto: string; restoId: string; dishId: string; name: string; price: number; image: string }[] = [];
    for (const r of restaurants) {
      for (const c of r.categories) {
        for (const d of c.dishes) {
          if (d.name.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle)) {
            dishes.push({ resto: r.name, restoId: r.id, dishId: d.id, name: d.name, price: d.price, image: d.image });
          }
        }
      }
    }
    return dishes.slice(0, 20);
  }, [q]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface/70 px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cherche un plat ou restaurant…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {q ? (
              <button onClick={() => setQ("")} aria-label="Effacer">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : (
              <SlidersHorizontal className="h-4 w-4 text-primary" />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        {!q && (
          <>
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" /> Tendances à {restaurants[0]?.city ?? "Douala"}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {trending.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium hover:border-primary/60 hover:text-primary transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock className="h-4 w-4" /> Récentes
              </h2>
              <ul className="mt-2 divide-y divide-border/60">
                {recent.map((r) => (
                  <li key={r}>
                    <button onClick={() => setQ(r)} className="flex w-full items-center justify-between py-3 text-sm">
                      <span>{r}</span>
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {q && (
          <section>
            <p className="text-xs text-muted-foreground">{results.length} résultat{results.length > 1 ? "s" : ""}</p>
            <ul className="mt-3 space-y-3">
              {results.map((d) => (
                <li key={`${d.restoId}-${d.dishId}`}>
                  <Link
                    to="/restaurants/$restoId/plats/$platId"
                    params={{ restoId: d.restoId, platId: d.dishId }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-2 hover:border-primary/60 transition"
                  >
                    <img src={d.image} alt={d.name} className="h-16 w-16 rounded-xl object-cover" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.resto}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{d.price.toLocaleString("fr-FR")} FCFA</span>
                  </Link>
                </li>
              ))}
              {results.length === 0 && (
                <li className="rounded-xl border border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
                  Aucun résultat pour « {q} »
                </li>
              )}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
