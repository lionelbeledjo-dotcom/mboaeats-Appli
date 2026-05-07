import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, Star, CheckCircle2, PauseCircle, Loader2, Power } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listAllRestaurants, setRestaurantActive } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/restaurants")({
  component: Restaurants,
});

type Resto = {
  id: string; name: string; city: string; neighborhood: string | null;
  cuisine: string; rating: number | null; reviews_count: number | null;
  is_active: boolean | null; is_open: boolean | null;
};

function Restaurants() {
  const fetchAll = useServerFn(listAllRestaurants);
  const setActive = useServerFn(setRestaurantActive);
  const [list, setList] = useState<Resto[] | null>(null);
  const [q, setQ] = useState("");

  const reload = () => fetchAll().then((r) => setList(r.restaurants as Resto[])).catch(() => setList([]));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const toggle = async (r: Resto) => {
    try {
      await setActive({ data: { id: r.id, is_active: !r.is_active } });
      toast.success(r.is_active ? "Restaurant suspendu" : "Restaurant activé");
      reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };

  const filtered = (list ?? []).filter((r) =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.city.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Restaurants</h1>
          <p className="text-sm text-muted-foreground">{(list ?? []).length} partenaires · {(list ?? []).filter(r => r.is_active).length} actifs</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher…"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm"
          />
          <Link to="/restaurant" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm hover:bg-surface/80">
            Espace Restaurant
          </Link>
        </div>
      </div>

      {!list && <div className="flex justify-center p-16"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((r) => (
          <div key={r.id} className="group rounded-3xl border border-border bg-surface/60 p-5 transition hover:border-primary/40 hover:shadow-glow">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
              <button onClick={() => toggle(r)} className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground">
                <Power className="h-3.5 w-3.5" />
              </button>
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">{r.name}</h3>
            <p className="text-xs text-muted-foreground">{r.city}{r.neighborhood ? ` · ${r.neighborhood}` : ""}</p>
            <p className="text-xs text-muted-foreground">{r.cuisine}</p>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gold">
                <Star className="h-3 w-3" /> {r.rating ? Number(r.rating).toFixed(1) : "—"}
              </span>
              <span className="text-muted-foreground">{r.reviews_count ?? 0} avis</span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {r.is_active
                ? <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Actif</span>
                : <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold"><PauseCircle className="h-3 w-3" /> Suspendu</span>}
              {r.is_open === false && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted-foreground">Fermé</span>}
            </div>
          </div>
        ))}
      </div>

      {list && filtered.length === 0 && (
        <p className="rounded-3xl border border-dashed border-border bg-surface/30 p-10 text-center text-sm text-muted-foreground">
          Aucun restaurant ne correspond à votre recherche.
        </p>
      )}
    </div>
  );
}
