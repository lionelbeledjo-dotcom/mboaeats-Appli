import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Coins, Store, Bike, AlertTriangle, Users, ArrowUpRight, Loader2, MapPin, Clock, Settings, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Console Admin · MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Overview,
});

type Stats = Awaited<ReturnType<typeof getAdminOverview>>;

function Overview() {
  const fetchStats = useServerFn(getAdminOverview);
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<{ tag: string; text: string; time: string; color: string }[]>([]);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => setStats(null));
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
        const o: any = p.new;
        setEvents((s) => [{ tag: "Commande", text: `${o.reference} · ${(o.total ?? 0).toLocaleString("fr-FR")} F`, time: "à l'instant", color: "bg-primary/15 text-primary" }, ...s].slice(0, 8));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "disputes" }, (p) => {
        const d: any = p.new;
        setEvents((s) => [{ tag: "Litige", text: d.reason ?? "Nouveau litige", time: "à l'instant", color: "bg-red-500/15 text-red-400" }, ...s].slice(0, 8));
      })
      .subscribe();
    const t = setInterval(() => fetchStats().then(setStats).catch(() => {}), 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [fetchStats]);

  if (!stats) {
    return <div className="flex items-center justify-center p-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const cityRows = Object.entries(stats.cityGmv).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(1, ...cityRows.map(([, v]) => v));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">Activité MboaEats · Cameroun · 7 derniers jours</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="GMV (7j)" value={`${(stats.gmv / 1000).toFixed(1)}K FCFA`} icon={<TrendingUp className="h-4 w-4 text-primary" />} accent="primary" />
        <Kpi label="Commandes" value={stats.ordersCount.toString()} icon={<Users className="h-4 w-4 text-primary" />} />
        <Kpi label="Restos actifs" value={`${stats.restosActive}/${stats.restosTotal}`} icon={<Store className="h-4 w-4 text-gold" />} accent="gold" />
        <Kpi label="Litiges ouverts" value={stats.disputesOpen.toString()} icon={<AlertTriangle className="h-4 w-4 text-red-400" />} accent="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">GMV par ville</h2>
            <span className="text-xs text-muted-foreground">FCFA</span>
          </div>
          <div className="mt-6 space-y-4">
            {cityRows.length === 0 && <p className="text-sm text-muted-foreground">Pas encore de commandes sur la période.</p>}
            {cityRows.map(([city, v], i) => (
              <div key={city}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold flex items-center gap-2"><MapPin className="h-3 w-3" />{city}</span>
                  <span className="text-muted-foreground">{v.toLocaleString("fr-FR")}</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${i === 0 ? "from-primary to-gold" : "from-primary to-primary-glow"} shadow-glow`}
                    style={{ width: `${(v / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <h2 className="font-display text-lg font-bold">Top restaurants</h2>
          <ul className="mt-4 space-y-3">
            {stats.topRestos.length === 0 && <li className="text-sm text-muted-foreground">—</li>}
            {stats.topRestos.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface"><Store className="h-4 w-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.count} commandes · {t.city}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-center">
            <div><Bike className="mx-auto h-4 w-4 text-gold" /><p className="mt-1 text-xs text-muted-foreground">Livreurs en ligne</p><p className="font-display text-lg font-bold">{stats.driversOnline}/{stats.driversTotal}</p></div>
            <div><Coins className="mx-auto h-4 w-4 text-gold" /><p className="mt-1 text-xs text-muted-foreground">Montant en litige</p><p className="font-display text-lg font-bold">{stats.disputesAmount.toLocaleString("fr-FR")}</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <h2 className="font-display text-lg font-bold">Activité en direct</h2>
        <div className="mt-4 divide-y divide-border">
          {events.length === 0 && <p className="py-6 text-sm text-muted-foreground">En attente d'événements en temps réel…</p>}
          {events.map((a, i) => (
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

function Kpi({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: "primary" | "gold" | "red" }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">{icon}</div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${accent === "gold" ? "text-gradient-gold" : accent === "primary" ? "text-gradient-primary" : ""}`}>{value}</p>
    </div>
  );
}
