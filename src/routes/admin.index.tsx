import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Coins, Store, Bike, AlertTriangle, Users, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function Overview() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">Activité MboaEats · Cameroun · 7 derniers jours</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="GMV (7j)" value="48.2M FCFA" trend="+12.4%" icon={<TrendingUp className="h-4 w-4 text-primary" />} accent="primary" />
        <Kpi label="Commissions" value="4.82M FCFA" trend="+11.8%" icon={<Coins className="h-4 w-4 text-gold" />} accent="gold" />
        <Kpi label="Commandes" value="2 184" trend="+8%" icon={<Users className="h-4 w-4 text-primary" />} />
        <Kpi label="Litiges ouverts" value="4" trend="-2" icon={<AlertTriangle className="h-4 w-4 text-red-400" />} accent="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">GMV par ville</h2>
            <span className="text-xs text-muted-foreground">FCFA</span>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { city: "Douala", v: 24.6, max: 25, color: "from-primary to-gold" },
              { city: "Yaoundé", v: 17.1, max: 25, color: "from-primary to-primary-glow" },
              { city: "Bafoussam", v: 6.5, max: 25, color: "from-gold to-primary" },
            ].map((c) => (
              <div key={c.city}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{c.city}</span>
                  <span className="text-muted-foreground">{c.v}M</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-background">
                  <div className={`h-full rounded-full bg-gradient-to-r ${c.color} shadow-glow`} style={{ width: `${(c.v / c.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <h2 className="font-display text-lg font-bold">Top performers</h2>
          <ul className="mt-4 space-y-3">
            {[
              { icon: <Store className="h-4 w-4 text-primary" />, name: "Chez Mama Biya", sub: "428 commandes" },
              { icon: <Store className="h-4 w-4 text-primary" />, name: "Le Wouri Grill", sub: "311 commandes" },
              { icon: <Bike className="h-4 w-4 text-gold" />, name: "Junior K. (Livreur)", sub: "127 courses · 4.92★" },
            ].map((t, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface">{t.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.sub}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <h2 className="font-display text-lg font-bold">Activité en direct</h2>
        <div className="mt-4 divide-y divide-border">
          {[
            { tag: "Commande", text: "MBE-2841 · Chez Mama Biya → Bonanjo", time: "il y a 12s", color: "bg-primary/15 text-primary" },
            { tag: "Litige", text: "MBE-2812 · Plat manquant signalé par client", time: "il y a 4 min", color: "bg-red-500/15 text-red-400" },
            { tag: "Onboarding", text: "Resto 'Saveurs Bafoussam' validé", time: "il y a 12 min", color: "bg-emerald-500/15 text-emerald-400" },
            { tag: "Retrait", text: "Junior K. · 10 000 FCFA via MTN MoMo", time: "il y a 22 min", color: "bg-gold/15 text-gold" },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${a.color}`}>{a.tag}</span>
                <span className="text-sm">{a.text}</span>
              </div>
              <span className="text-xs text-muted-foreground">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, trend, icon, accent }: { label: string; value: string; trend: string; icon: React.ReactNode; accent?: "primary" | "gold" | "red" }) {
  const trendColor = trend.startsWith("-") && accent !== "red" ? "text-red-400" :
    accent === "red" ? "text-emerald-400" : "text-emerald-400";
  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">{icon}</div>
        <span className={`text-xs font-bold ${trendColor}`}>{trend}</span>
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${accent === "gold" ? "text-gradient-gold" : accent === "primary" ? "text-gradient-primary" : ""}`}>{value}</p>
    </div>
  );
}
