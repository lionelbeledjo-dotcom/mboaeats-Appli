import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Store, Star, CheckCircle2, PauseCircle, Loader2, Search,
  MapPin, Utensils, ShieldCheck, ShieldOff, Filter, Eye, X,
  Phone, User, FileCheck2, FileX2, Hash, Image as ImageIcon, Clock,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listAllRestaurants, setRestaurantActive, getRestaurantDetails } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Restaurants,
});

type Resto = {
  id: string; name: string; city: string; neighborhood: string | null;
  cuisine: string; rating: number | null; reviews_count: number | null;
  is_active: boolean | null; is_open: boolean | null;
};

type StatusFilter = "all" | "active" | "suspended";

type Details = {
  restaurant: Record<string, any>;
  owner: { full_name: string | null; phone: string | null; city: string | null } | null;
  stats: { dishes: number; orders: number };
} | null;

function Restaurants() {
  const fetchAll = useServerFn(listAllRestaurants);
  const setActive = useServerFn(setRestaurantActive);
  const fetchDetails = useServerFn(getRestaurantDetails);
  const [list, setList] = useState<Resto[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const openDetails = async (id: string) => {
    setOpenId(id);
    setDetails(null);
    setDetailsLoading(true);
    try {
      const d = await fetchDetails({ data: { id } });
      setDetails(d as Details);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      setOpenId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const reload = () =>
    fetchAll()
      .then((r) => setList(r.restaurants as Resto[]))
      .catch(() => setList([]));

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const updateStatus = async (r: Resto, next: boolean) => {
    const verb = next ? "Approuver" : "Désactiver";
    if (!window.confirm(`${verb} le restaurant « ${r.name} » ?`)) return;
    setPendingId(r.id);
    try {
      await setActive({ data: { id: r.id, is_active: next } });
      toast.success(next ? "Restaurant approuvé et publié" : "Restaurant désactivé");
      // Mise à jour optimiste pour éviter un round-trip
      setList((cur) =>
        (cur ?? []).map((x) => (x.id === r.id ? { ...x, is_active: next } : x))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPendingId(null);
    }
  };

  const counts = useMemo(() => {
    const all = list ?? [];
    return {
      all: all.length,
      active: all.filter((r) => r.is_active).length,
      suspended: all.filter((r) => !r.is_active).length,
    };
  }, [list]);

  const filtered = useMemo(() => {
    return (list ?? [])
      .filter((r) => {
        if (filter === "active") return !!r.is_active;
        if (filter === "suspended") return !r.is_active;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
          r.name.toLowerCase().includes(needle) ||
          r.city.toLowerCase().includes(needle) ||
          (r.neighborhood ?? "").toLowerCase().includes(needle) ||
          r.cuisine.toLowerCase().includes(needle)
        );
      });
  }, [list, filter, q]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Restaurants</h1>
          <p className="text-sm text-muted-foreground">
            {counts.all} partenaire{counts.all > 1 ? "s" : ""} ·{" "}
            <span className="text-emerald-400">{counts.active} actif{counts.active > 1 ? "s" : ""}</span> ·{" "}
            <span className="text-gold">{counts.suspended} en attente / suspendu{counts.suspended > 1 ? "s" : ""}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, ville, cuisine…"
              className="w-48 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Link
            to="/restaurant"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm hover:bg-surface/80"
          >
            Espace Restaurant
          </Link>
        </div>
      </div>

      {/* Tabs filtres */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/50 p-1.5">
        <Filter className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
        {([
          { key: "all", label: "Tous", count: counts.all },
          { key: "active", label: "Actifs", count: counts.active },
          { key: "suspended", label: "À approuver / suspendus", count: counts.suspended },
        ] as { key: StatusFilter; label: string; count: number }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === t.key
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-background"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                filter === t.key ? "bg-primary-foreground/20" : "bg-background"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {!list && (
        <div className="flex justify-center p-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((r) => {
          const busy = pendingId === r.id;
          return (
            <div
              key={r.id}
              className="group flex flex-col rounded-3xl border border-border bg-surface/60 p-5 transition hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <Store className="h-5 w-5 text-primary-foreground" />
                </div>
                {r.is_active ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Actif
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
                    <PauseCircle className="h-3 w-3" /> En attente
                  </span>
                )}
              </div>

              <h3 className="mt-3 font-display text-lg font-bold leading-tight">{r.name}</h3>

              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {r.city}
                  {r.neighborhood ? ` · ${r.neighborhood}` : ""}
                </p>
                <p className="flex items-center gap-1.5">
                  <Utensils className="h-3 w-3" />
                  {r.cuisine}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-gold">
                  <Star className="h-3 w-3 fill-gold" />
                  {r.rating ? Number(r.rating).toFixed(1) : "—"}
                </span>
                <span className="text-muted-foreground">{r.reviews_count ?? 0} avis</span>
                {r.is_open === false && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                    Fermé
                  </span>
                )}
              </div>

              <div className="mt-auto space-y-2 pt-4">
                <button
                  onClick={() => openDetails(r.id)}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/50 text-xs font-semibold text-foreground transition hover:bg-background"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir détails & documents
                </button>
                {r.is_active ? (
                  <button
                    onClick={() => updateStatus(r, false)}
                    disabled={busy}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                    Désactiver
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(r, true)}
                    disabled={busy}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-xs font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Approuver et publier
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {list && filtered.length === 0 && (
        <p className="rounded-3xl border border-dashed border-border bg-surface/30 p-10 text-center text-sm text-muted-foreground">
          Aucun restaurant ne correspond à ce filtre.
        </p>
      )}
    </div>
  );
}
