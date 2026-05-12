import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X, Star, Clock, Bike } from "lucide-react";
import { restaurants } from "@/data/restaurants";
import {
  CUISINE_KEYS,
  CUISINE_LABEL,
  catalogBadge,
  badgeMeta,
  deliveryFee,
  distanceKm,
  etaMinAvg,
  hasPromo,
  inferCuisine,
  type CuisineKey,
} from "@/lib/restaurant-meta";

type SortKey = "relevance" | "rating" | "eta" | "price" | "distance";

export const Route = createFileRoute("/recherche")({
  head: () => ({
    meta: [
      { title: "Recherche — MboaEats" },
      { name: "description", content: "Trouvez vos plats et restaurants préférés au Cameroun." },
    ],
  }),
  component: RecherchePage,
});

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Pertinence",
  rating: "Mieux notés",
  eta: "Plus rapides",
  price: "Moins chers",
  distance: "Plus proches",
};

function RecherchePage() {
  // Saisie immédiate (UI) vs requête appliquée (filtrage) — debouncée + transition
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const deferredQ = useDeferredValue(appliedQ);
  const [isPending, startTransition] = useTransition();
  const [sort, setSort] = useState<SortKey>("relevance");
  const [cuisine, setCuisine] = useState<CuisineKey | "all">("all");
  const [promosOnly, setPromosOnly] = useState(false);
  const [maxEta, setMaxEta] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce 180 ms : ne déclenche le recalcul qu'à la pause de frappe.
  useEffect(() => {
    const t = window.setTimeout(() => {
      startTransition(() => setAppliedQ(q));
    }, 180);
    return () => window.clearTimeout(t);
  }, [q]);

  const results = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    let list = restaurants.filter((r) => {
      if (needle) {
        const inResto = r.name.toLowerCase().includes(needle) || r.tagline.toLowerCase().includes(needle);
        const inDish = r.categories.some((c) => c.dishes.some((d) => d.name.toLowerCase().includes(needle)));
        if (!inResto && !inDish) return false;
      }
      if (cuisine !== "all" && inferCuisine(r) !== cuisine) return false;
      if (promosOnly && !hasPromo(r)) return false;
      if (maxEta && etaMinAvg(r.eta) > maxEta) return false;
      return true;
    });

    const sorted = [...list];
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === "eta") sorted.sort((a, b) => etaMinAvg(a.eta) - etaMinAvg(b.eta));
    else if (sort === "distance") sorted.sort((a, b) => distanceKm(a) - distanceKm(b));
    else if (sort === "price") {
      const min = (r: typeof restaurants[number]) => Math.min(...r.categories.flatMap((c) => c.dishes.map((d) => d.price)));
      sorted.sort((a, b) => min(a) - min(b));
    }
    return sorted;
  }, [deferredQ, sort, cuisine, promosOnly, maxEta]);

  const isStale = isPending || deferredQ !== appliedQ || appliedQ !== q;

  const activeCount =
    (cuisine !== "all" ? 1 : 0) + (promosOnly ? 1 : 0) + (maxEta ? 1 : 0) + (sort !== "relevance" ? 1 : 0);

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden" style={{ backgroundColor: "#F5F0E8" }}>
      <header className="sticky top-0 z-40 w-full max-w-[100vw] overflow-x-hidden bg-white" style={{ boxShadow: "0 2px 12px -8px rgba(0,0,0,0.10)" }}>
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ border: "1px solid #E5E5E5" }}>
            <Search className="h-4 w-4" style={{ color: "#6B6B6B" }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cherche un plat, restaurant ou cuisine…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Effacer">
                <X className="h-4 w-4" style={{ color: "#6B6B6B" }} />
              </button>
            )}
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Filtres"
              className="relative ml-1 flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: showFilters ? "#06C167" : "transparent" }}
            >
              <SlidersHorizontal className="h-4 w-4" style={{ color: showFilters ? "#FFFFFF" : "#06C167" }} />
              {activeCount > 0 && !showFilters && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: "#06C167" }}
                >
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-3 rounded-2xl bg-white p-3" style={{ border: "1px solid #E5E5E5" }}>
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#6B6B6B" }}>Trier par</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => (
                    <Chip key={s} active={sort === s} onClick={() => setSort(s)}>
                      {SORT_LABELS[s]}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#6B6B6B" }}>Cuisine</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={cuisine === "all"} onClick={() => setCuisine("all")}>Toutes</Chip>
                  {CUISINE_KEYS.map((k) => (
                    <Chip key={k} active={cuisine === k} onClick={() => setCuisine(k)}>
                      {CUISINE_LABEL[k]}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#6B6B6B" }}>Temps max</p>
                <div className="flex flex-wrap gap-1.5">
                  {[null, 20, 30, 45].map((m) => (
                    <Chip key={String(m)} active={maxEta === m} onClick={() => setMaxEta(m)}>
                      {m ? `< ${m} min` : "Tous"}
                    </Chip>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 rounded-lg px-1 py-1">
                <span className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>Promotions actives uniquement</span>
                <input
                  type="checkbox"
                  checked={promosOnly}
                  onChange={(e) => setPromosOnly(e.target.checked)}
                  className="h-5 w-5 accent-[#06C167]"
                />
              </label>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-4 overflow-x-hidden">
        <p className="text-xs" style={{ color: "#6B6B6B" }}>
          {results.length} résultat{results.length > 1 ? "s" : ""}
          {q && <> pour « {q} »</>}
        </p>

        <ul className="mt-3 space-y-3 w-full">
          {results.map((r) => {
            const badge = badgeMeta(catalogBadge(r));
            const fee = deliveryFee(r);
            return (
              <li key={r.id} className="w-full max-w-full">
                <Link
                  to="/restaurants/$restoId"
                  params={{ restoId: r.id }}
                  className="flex w-full max-w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 transition active:scale-[0.99]"
                  style={{ boxShadow: "0 2px 12px -8px rgba(0,0,0,0.08)" }}
                >
                  <div className="relative h-20 w-20 shrink-0">
                    <img src={r.cover} alt={r.name} className="h-20 w-20 rounded-xl object-cover" loading="lazy" />
                    {badge && (
                      <span
                        className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase"
                        style={{ backgroundColor: badge.bg, color: badge.fg }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold" style={{ color: "#1A1A1A" }}>{r.name}</p>
                    <p className="truncate text-[12px]" style={{ color: "#6B6B6B" }}>{r.tagline.split("—")[0].trim()}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]" style={{ color: "#6B6B6B" }}>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-current" style={{ color: "#F4A623" }} />
                        <span className="font-semibold" style={{ color: "#1A1A1A" }}>{r.rating}</span>
                      </span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.eta}</span>
                      <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> {fee.toLocaleString("fr-FR")}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="rounded-xl bg-white p-6 text-center text-sm" style={{ color: "#6B6B6B", border: "1px solid #E5E5E5" }}>
              Aucun résultat. Essayez d'élargir vos filtres.
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition"
      style={{
        backgroundColor: active ? "#06C167" : "#F5F0E8",
        color: active ? "#FFFFFF" : "#1A1A1A",
        border: active ? "1px solid #06C167" : "1px solid #E5E5E5",
      }}
    >
      {children}
    </button>
  );
}
