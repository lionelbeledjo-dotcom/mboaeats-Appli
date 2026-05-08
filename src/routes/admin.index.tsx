import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp, ShoppingBag, UserPlus, Bike, CheckCircle2, Clock, X, User, MapPin, Phone, CreditCard,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Vue d'ensemble · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Overview,
});

const KPIS = [
  { label: "Ventes totales", value: "4 875 000", suffix: "XAF", hint: "+12,4 % vs semaine dernière", icon: TrendingUp, accent: "primary" as const },
  { label: "Commandes aujourd'hui", value: "187", hint: "32 en cours · 155 livrées", icon: ShoppingBag, accent: "gold" as const },
  { label: "Nouveaux clients", value: "46", hint: "Douala · 7 derniers jours", icon: UserPlus, accent: "primary" as const },
  { label: "Livreurs actifs", value: "23", hint: "sur 31 partenaires", icon: Bike, accent: "gold" as const },
];

const WEEK = [
  { day: "Lun", revenu: 540_000 },
  { day: "Mar", revenu: 620_000 },
  { day: "Mer", revenu: 480_000 },
  { day: "Jeu", revenu: 720_000 },
  { day: "Ven", revenu: 910_000 },
  { day: "Sam", revenu: 1_180_000 },
  { day: "Dim", revenu: 845_000 },
];

type OrderRow = {
  id: string; client: string; amount: number;
  status: "en_cours" | "livree";
  resto: string; phone: string; address: string; payment: string; items: string[]; date: string;
};

const LAST_ORDERS: OrderRow[] = [
  { id: "MBE-2106", client: "Awa Mbarga", amount: 7_500, status: "en_cours", resto: "Le Wouri Saveurs", phone: "+237 6 99 12 34 56", address: "Akwa, rue Joss · Douala", payment: "Orange Money", items: ["Ndolé royal", "Jus de bissap"], date: "Aujourd'hui · 12:34" },
  { id: "MBE-2105", client: "Joseph Ngono", amount: 12_300, status: "livree", resto: "Soya d'Or", phone: "+237 6 77 04 88 21", address: "Bonapriso · Douala", payment: "MTN MoMo", items: ["Soya bœuf x3", "Plantain braisé"], date: "Aujourd'hui · 12:10" },
  { id: "MBE-2104", client: "Linda Etoundi", amount: 4_200, status: "livree", resto: "La Marmite Bamiléké", phone: "+237 6 90 55 41 02", address: "Bonamoussadi · Douala", payment: "Espèces", items: ["Koki maïs", "Eau minérale"], date: "Aujourd'hui · 11:48" },
  { id: "MBE-2103", client: "Patrick Mbida", amount: 9_800, status: "en_cours", resto: "Douala Fast Food", phone: "+237 6 55 23 19 77", address: "Logpom · Douala", payment: "Carte bancaire", items: ["Burger maison", "Frites", "Sprite"], date: "Aujourd'hui · 11:30" },
  { id: "MBE-2102", client: "Sylvie Kamga", amount: 15_600, status: "livree", resto: "Poisson Braisé du Port", phone: "+237 6 78 66 90 12", address: "Bali · Douala", payment: "Orange Money", items: ["Bar braisé", "Miondo", "Sauce pimentée"], date: "Aujourd'hui · 11:05" },
];

function Overview() {
  const [selected, setSelected] = useState<OrderRow | null>(null);
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">Activité MboaEats · Douala · Aperçu en direct</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-3xl border border-border bg-surface/60 p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                <k.icon className={`h-5 w-5 ${k.accent === "gold" ? "text-gold" : "text-primary"}`} />
              </span>
              {k.suffix && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.suffix}</span>}
            </div>
            <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${k.accent === "gold" ? "text-gradient-gold" : "text-gradient-primary"}`}>{k.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Revenus de la semaine</h2>
            <span className="text-xs text-muted-foreground">FCFA</span>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEK} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--gold, 45 90% 55%))" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString("fr-FR")} F`, "Revenus"]}
                />
                <Line type="monotone" dataKey="revenu" stroke="url(#lineGrad)" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <h2 className="font-display text-lg font-bold">5 dernières commandes</h2>
          <ul className="mt-4 space-y-3">
            {LAST_ORDERS.map((o) => (
              <li key={o.id} className="rounded-2xl border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs font-bold text-primary">{o.id}</span>
                  {o.status === "livree" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Livré
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Clock className="h-3 w-3" /> En cours
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{o.client}</p>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">{o.resto}</span>
                  <span className="font-bold text-foreground">{o.amount.toLocaleString("fr-FR")} F</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
