import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Store, Bell, TrendingUp, Coins, Clock, Check, X,
  Search, ChefHat, Power, Star, ShoppingBag,
} from "lucide-react";

export const Route = createFileRoute("/restaurant")({
  component: RestaurantSpace,
  head: () => ({
    meta: [
      { title: "Espace Restaurant · MboaEats" },
      { name: "description", content: "Gérez votre menu, vos commandes entrantes et vos statistiques de ventes." },
    ],
  }),
});

type Tab = "commandes" | "menu" | "stats";

function RestaurantSpace() {
  const [tab, setTab] = useState<Tab>("commandes");
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Site
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-none">Chez Mama Biya</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Akwa, Douala · ★ 4.9</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition border ${
              open ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border-border bg-surface text-muted-foreground"
            }`}
          >
            <Power className="h-3.5 w-3.5" /> {open ? "Ouvert" : "Fermé"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-5 md:px-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <Kpi label="CA du jour" value="186 400" sub="FCFA" icon={<Coins className="h-4 w-4 text-gold" />} accent="gold" />
          <Kpi label="Commandes" value="42" sub="aujourd'hui" icon={<ShoppingBag className="h-4 w-4 text-primary" />} />
          <Kpi label="Note clients" value="4.9" sub="sur 124 avis" icon={<Star className="h-4 w-4 text-gold" />} />
          <Kpi label="Temps prépa" value="14 min" sub="moyen" icon={<Clock className="h-4 w-4 text-primary" />} />
        </div>
      </div>

      <nav className="sticky top-[64px] z-30 mx-auto mt-4 flex max-w-6xl gap-2 px-4 md:px-8">
        {(["commandes", "menu", "stats"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
              tab === t ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "border border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-6xl px-4 pt-5 md:px-8">
        {tab === "commandes" && <Commandes />}
        {tab === "menu" && <Menu />}
        {tab === "stats" && <Stats />}
      </main>
    </div>
  );
}

function Kpi({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent?: "gold" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-background">{icon}</div>
        <TrendingUp className="h-3 w-3 text-emerald-400" />
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${accent === "gold" ? "text-gradient-gold" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

const initialOrders = [
  { id: "MBE-2841", client: "Sandra K.", items: ["1 Ndolé poisson", "1 Bissap"], total: 3500, time: "À l'instant", status: "new" as const },
  { id: "MBE-2840", client: "Eric N.", items: ["2 Poulet DG"], total: 5800, time: "il y a 4 min", status: "preparing" as const },
  { id: "MBE-2839", client: "Christelle M.", items: ["1 Eru Fufu", "1 Beignet"], total: 2900, time: "il y a 9 min", status: "ready" as const },
];

function Commandes() {
  const [orders, setOrders] = useState(initialOrders);
  const advance = (id: string) => setOrders((o) =>
    o.map((x) => x.id === id ? {
      ...x,
      status: x.status === "new" ? "preparing" : x.status === "preparing" ? "ready" : "ready",
    } : x)
  );
  const reject = (id: string) => setOrders((o) => o.filter((x) => x.id !== id));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(["new", "preparing", "ready"] as const).map((col) => {
        const list = orders.filter((o) => o.status === col);
        const meta = col === "new" ? { label: "Nouvelles", color: "text-primary", dot: "bg-primary" } :
          col === "preparing" ? { label: "En préparation", color: "text-gold", dot: "bg-gold" } :
          { label: "Prêtes à livrer", color: "text-emerald-400", dot: "bg-emerald-400" };
        return (
          <div key={col} className="rounded-3xl border border-border bg-surface/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
                <h3 className={`font-display text-sm font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</h3>
              </div>
              <span className="text-xs text-muted-foreground">{list.length}</span>
            </div>

            <div className="mt-3 space-y-3">
              {list.map((o) => (
                <div key={o.id} className="rounded-2xl border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-muted-foreground">#{o.id}</p>
                    <p className="text-xs text-muted-foreground">{o.time}</p>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{o.client}</p>
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {o.items.map((it) => <li key={it}>· {it}</li>)}
                  </ul>
                  <p className="mt-2 font-bold text-gradient-gold">{o.total.toLocaleString("fr-FR")} FCFA</p>

                  <div className="mt-3 flex gap-2">
                    {col === "new" && (
                      <>
                        <button onClick={() => reject(o.id)} className="flex-1 rounded-xl border border-border bg-background py-2 text-xs font-semibold hover:bg-surface">
                          <X className="mx-auto h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => advance(o.id)} className="flex-[2] rounded-xl bg-gradient-primary py-2 text-xs font-bold text-primary-foreground">
                          Accepter · Préparer
                        </button>
                      </>
                    )}
                    {col === "preparing" && (
                      <button onClick={() => advance(o.id)} className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300">
                        <Check className="mr-1 inline h-3.5 w-3.5" /> Marquer prête
                      </button>
                    )}
                    {col === "ready" && (
                      <button className="w-full rounded-xl border border-gold/40 bg-gold/10 py-2 text-xs font-bold text-gold">
                        <Bell className="mr-1 inline h-3.5 w-3.5" /> Appeler livreur
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                  Aucune commande
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const initialMenu = [
  { name: "Ndolé poisson", price: 2500, cat: "Plats", available: true, sales: 142 },
  { name: "Poulet DG", price: 3500, cat: "Plats", available: true, sales: 128 },
  { name: "Eru Fufu", price: 2200, cat: "Plats", available: true, sales: 96 },
  { name: "Poisson braisé", price: 4000, cat: "Grillades", available: false, sales: 84 },
  { name: "Brochettes Suya", price: 1500, cat: "Grillades", available: true, sales: 72 },
  { name: "Bissap maison", price: 800, cat: "Boissons", available: true, sales: 210 },
  { name: "Beignets soufflés", price: 500, cat: "Snacks", available: true, sales: 188 },
];

function Menu() {
  const [items, setItems] = useState(initialMenu);
  const [q, setQ] = useState("");
  const toggle = (name: string) => setItems((s) => s.map((i) => i.name === name ? { ...i, available: !i.available } : i));
  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-surface/60 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un plat…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          + Ajouter un plat
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface/60">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Plat</th>
              <th className="p-4 text-left">Catégorie</th>
              <th className="p-4 text-right">Prix</th>
              <th className="p-4 text-right">Ventes (7j)</th>
              <th className="p-4 text-center">Disponible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((i) => (
              <tr key={i.name} className="hover:bg-background/40">
                <td className="p-4 font-semibold">{i.name}</td>
                <td className="p-4 text-muted-foreground">{i.cat}</td>
                <td className="p-4 text-right">{i.price.toLocaleString("fr-FR")} F</td>
                <td className="p-4 text-right">{i.sales}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => toggle(i.name)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${i.available ? "bg-gradient-primary shadow-glow" : "bg-surface border border-border"}`}
                    aria-label={i.available ? "Désactiver" : "Activer"}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${i.available ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stats() {
  const week = [
    { d: "Lun", v: 142 }, { d: "Mar", v: 168 }, { d: "Mer", v: 134 },
    { d: "Jeu", v: 196 }, { d: "Ven", v: 224 }, { d: "Sam", v: 268 }, { d: "Dim", v: 186 },
  ];
  const max = Math.max(...week.map((d) => d.v));

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Commandes cette semaine</p>
            <p className="mt-1 font-display text-3xl font-extrabold">1 318</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> +14% vs S-1
          </span>
        </div>
        <div className="mt-6 flex h-44 items-end gap-3">
          {week.map((d, i) => {
            const h = (d.v / max) * 100;
            const today = i === 5;
            return (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div className={`w-full rounded-t-xl ${today ? "bg-gradient-to-t from-primary to-gold shadow-glow" : "bg-primary/30"}`} style={{ height: `${h}%` }} />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.d}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <h3 className="font-display text-lg font-bold">Top plats</h3>
          <ul className="mt-4 space-y-3">
            {[
              { name: "Bissap maison", v: 210 },
              { name: "Beignets soufflés", v: 188 },
              { name: "Ndolé poisson", v: 142 },
              { name: "Poulet DG", v: 128 },
            ].map((p) => (
              <li key={p.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted-foreground">{p.v}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-gold" style={{ width: `${(p.v / 210) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <h3 className="font-display text-lg font-bold">Heures de pointe</h3>
          <div className="mt-4 grid grid-cols-12 gap-1.5">
            {Array.from({ length: 12 }).map((_, h) => {
              const v = [10, 6, 4, 18, 38, 62, 28, 22, 36, 78, 52, 24][h];
              return (
                <div key={h} className="flex flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-background">
                    <div className="w-full bg-gradient-to-t from-primary to-gold" style={{ height: `${v}%` }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{10 + h}h</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Pic principal : 19h-20h · Renforcer la cuisine</p>
        </div>
      </div>
    </div>
  );
}
