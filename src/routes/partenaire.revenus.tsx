import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShoppingBag, CheckCircle2, Coins, TrendingUp } from "lucide-react";
import { getRestaurantStats } from "@/server/restaurant.functions";
import { usePartenaire } from "@/components/partenaire/PartenaireContext";

export const Route = createFileRoute("/partenaire/revenus")({
  component: RevenusPage,
});

// Commission de la plateforme (par défaut)
const COMMISSION_RATE = 0.15;

function RevenusPage() {
  const { active } = usePartenaire();
  const fetchStats = useServerFn(getRestaurantStats);
  const [stats, setStats] = useState<{
    ordersCount: number; deliveredCount: number; inProgress: number;
    revenue: number; avgTicket: number;
  } | null>(null);

  const reload = useCallback(async () => {
    const r = await fetchStats({ data: { restaurant_id: active.id } });
    setStats(r);
  }, [fetchStats, active.id]);

  useEffect(() => { reload(); }, [reload]);

  if (!stats) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const commission = Math.round(stats.revenue * COMMISSION_RATE);
  const net = stats.revenue - commission;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Revenus</h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          7 derniers jours
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Commandes" value={stats.ordersCount.toString()} hint={`dont ${stats.inProgress} en cours`} />
        <StatCard icon={CheckCircle2} label="Livrées" value={stats.deliveredCount.toString()} hint={`ticket moyen ${stats.avgTicket.toLocaleString("fr-FR")} F`} />
        <StatCard icon={TrendingUp} label="Total commandes" value={`${stats.revenue.toLocaleString("fr-FR")} F`} hint="brut livré" />
        <StatCard icon={Coins} label="Net restaurant" value={`${net.toLocaleString("fr-FR")} F`} hint={`commission ${(COMMISSION_RATE * 100).toFixed(0)}% = ${commission.toLocaleString("fr-FR")} F`} accent />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-bold">Détail commissions</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Chiffre d'affaires brut (livré)" value={`${stats.revenue.toLocaleString("fr-FR")} F`} />
          <Row label={`Commission plateforme (${(COMMISSION_RATE * 100).toFixed(0)}%)`} value={`− ${commission.toLocaleString("fr-FR")} F`} />
          <div className="my-2 border-t border-border" />
          <Row label="Net à reverser" value={`${net.toLocaleString("fr-FR")} F`} bold />
        </dl>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, hint, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? "font-display text-base font-bold text-primary" : ""}>{value}</dd>
    </div>
  );
}
