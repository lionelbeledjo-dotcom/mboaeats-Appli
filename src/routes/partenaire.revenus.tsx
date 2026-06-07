import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShoppingBag, Coins, TrendingUp, Percent } from "lucide-react";
import { getRestaurantRevenue } from "@/lib/commissions.functions";
import { usePartenaire } from "@/components/partenaire/PartenaireContext";

export const Route = createFileRoute("/partenaire/revenus")({
  component: RevenusPage,
});

type Period = "today" | "7d" | "30d" | "all";
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "all", label: "Total" },
];

function RevenusPage() {
  const { active } = usePartenaire();
  const fetchRevenue = useServerFn(getRestaurantRevenue);
  const [period, setPeriod] = useState<Period>("7d");
  const [data, setData] = useState<{
    ordersCount: number; totalSales: number;
    totalCommission: number; totalNet: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchRevenue({ data: { restaurant_id: active.id, period } });
      setData(r);
    } finally { setLoading(false); }
  }, [fetchRevenue, active.id, period]);

  useEffect(() => { reload(); }, [reload]);

  if (loading || !data) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Revenus</h1>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium transition " +
                (period === p.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted")
              }
            >{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Commandes livrées" value={String(data.ordersCount)} />
        <StatCard icon={TrendingUp} label="Total ventes" value={`${data.totalSales.toLocaleString("fr-FR")} F`} hint="sous-total cumulé" />
        <StatCard icon={Percent} label="Commission MboaEats" value={`${data.totalCommission.toLocaleString("fr-FR")} F`} />
        <StatCard icon={Coins} label="Net perçu" value={`${data.totalNet.toLocaleString("fr-FR")} F`} accent />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-bold">Détail commissions</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Total ventes (sous-total cumulé)" value={`${data.totalSales.toLocaleString("fr-FR")} F`} />
          <Row label="Commission MboaEats" value={`− ${data.totalCommission.toLocaleString("fr-FR")} F`} />
          <div className="my-2 border-t border-border" />
          <Row label="Net perçu" value={`${data.totalNet.toLocaleString("fr-FR")} F`} bold />
        </dl>
        <p className="mt-3 text-[11px] text-muted-foreground">
          La commission s'applique uniquement sur le sous-total plats (hors livraison). Chaque commande conserve le taux figé au moment de sa création.
        </p>
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
