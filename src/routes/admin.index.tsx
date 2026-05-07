import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Coins, Store, Bike, AlertTriangle, Users, ArrowUpRight, Loader2, MapPin, Clock, Settings, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview } from "@/server/admin.functions";
import { ErrorState } from "@/components/admin/ErrorState";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Console Admin · MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Overview,
});

type Stats = Awaited<ReturnType<typeof getAdminOverview>>;

function Overview() {
  const fetchStats = useServerFn(getAdminOverview);
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<{ tag: string; text: string; time: string; color: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    return fetchStats()
      .then(setStats)
      .catch((e) => { setStats(null); setError(e instanceof Error ? e.message : "Erreur réseau"); });
  };

  useEffect(() => {
    load();
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
    const t = setInterval(load, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
    // eslint-disable-next-line
  }, []);

  if (error) {
    return <div className="mx-auto max-w-7xl p-6"><ErrorState message={error} onRetry={load} /></div>;
  }

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Commandes en attente" value={(stats as any).ordersPending?.toString() ?? "0"} icon={<Clock className="h-4 w-4 text-primary" />} accent="primary" hint={`${stats.ordersCount} sur 7j · ${stats.delivered} livrées`} />
        <Kpi label="Litiges ouverts" value={stats.disputesOpen.toString()} icon={<AlertTriangle className="h-4 w-4 text-red-400" />} accent="red" hint={`${stats.disputesAmount.toLocaleString("fr-FR")} F en jeu`} />
        <Kpi label="Restos actifs" value={`${stats.restosActive}/${stats.restosTotal}`} icon={<Store className="h-4 w-4 text-gold" />} accent="gold" hint="Partenaires en ligne" />
        <Kpi label="Livreurs en ligne" value={`${stats.driversOnline}/${stats.driversTotal}`} icon={<Bike className="h-4 w-4 text-primary" />} hint="Disponibles maintenant" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Shortcut to="/admin/litiges" icon={AlertTriangle} label="Litiges" sub="Traiter & résoudre" badge={stats.disputesOpen || undefined} accent="red" />
        <Shortcut to="/admin/restaurants" icon={Store} label="Restaurants" sub="Activer / suspendre" />
        <Shortcut to="/admin/livreurs" icon={Bike} label="Livreurs" sub="Suivi & flotte" />
        <Shortcut to="/admin/commissions" icon={Coins} label="Commissions" sub="Taux & rapport" accent="gold" />
        <Shortcut to="/admin/zones" icon={MapPin} label="Zones livraison" sub="Tarifs & ETA" />
        <Shortcut to="/admin/parametres" icon={Settings} label="Paramètres" sub="Plateforme & admins" accent="primary" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Kpi label="GMV (7j)" value={`${(stats.gmv / 1000).toFixed(1)}K FCFA`} icon={<TrendingUp className="h-4 w-4 text-primary" />} accent="primary" />
        <Kpi label="Total commandes (7j)" value={stats.ordersCount.toString()} icon={<Users className="h-4 w-4 text-primary" />} />
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

function Kpi({ label, value, icon, accent, hint }: { label: string; value: string; icon: React.ReactNode; accent?: "primary" | "gold" | "red"; hint?: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background">{icon}</div>
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${accent === "gold" ? "text-gradient-gold" : accent === "primary" ? "text-gradient-primary" : accent === "red" ? "text-red-400" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Shortcut({
  to, icon: Icon, label, sub, badge, accent,
}: {
  to: string; icon: typeof Store; label: string; sub: string; badge?: number;
  accent?: "primary" | "gold" | "red";
}) {
  const ring =
    accent === "red" ? "border-red-500/30 hover:border-red-500/60"
    : accent === "gold" ? "border-gold/30 hover:border-gold/60"
    : accent === "primary" ? "border-primary/40 hover:border-primary/70"
    : "border-border hover:border-primary/40";
  const iconColor =
    accent === "red" ? "text-red-400"
    : accent === "gold" ? "text-gold"
    : "text-primary";
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-2xl border ${ring} bg-surface/60 p-4 transition hover:shadow-glow`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
      {badge ? (
        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">{badge}</span>
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      )}
    </Link>
  );
}
