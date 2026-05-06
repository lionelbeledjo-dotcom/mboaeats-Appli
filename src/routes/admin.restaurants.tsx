import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, Star, MoreHorizontal, Plus, CheckCircle2, PauseCircle } from "lucide-react";

export const Route = createFileRoute("/admin/restaurants")({
  component: Restaurants,
});

const data = [
  { name: "Chez Mama Biya", city: "Douala", rating: 4.9, orders: 428, status: "Actif" },
  { name: "Saveurs du Mboa", city: "Douala", rating: 4.8, orders: 356, status: "Actif" },
  { name: "Le Wouri Grill", city: "Douala", rating: 4.9, orders: 311, status: "Actif" },
  { name: "Suya King", city: "Yaoundé", rating: 4.7, orders: 198, status: "Actif" },
  { name: "Ndolé Express", city: "Bafoussam", rating: 4.6, orders: 142, status: "En pause" },
  { name: "Saveurs Bafoussam", city: "Bafoussam", rating: 0, orders: 0, status: "À valider" },
];

function Restaurants() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Restaurants</h1>
          <p className="text-sm text-muted-foreground">214 partenaires actifs sur 3 villes</p>
        </div>
        <div className="flex gap-2">
          <Link to="/restaurant" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm hover:bg-surface/80">
            Espace Restaurant
          </Link>
          <button className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4" /> Onboarder
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((r) => (
          <div key={r.name} className="group rounded-3xl border border-border bg-surface/60 p-5 transition hover:border-primary/40 hover:shadow-glow">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
              <button className="opacity-0 transition group-hover:opacity-100"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">{r.name}</h3>
            <p className="text-xs text-muted-foreground">{r.city}</p>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gold">
                <Star className="h-3 w-3" /> {r.rating > 0 ? r.rating.toFixed(1) : "—"}
              </span>
              <span className="text-muted-foreground">{r.orders} cmds</span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {r.status === "Actif" && <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Actif</span>}
              {r.status === "En pause" && <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold"><PauseCircle className="h-3 w-3" /> En pause</span>}
              {r.status === "À valider" && <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">À valider</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
