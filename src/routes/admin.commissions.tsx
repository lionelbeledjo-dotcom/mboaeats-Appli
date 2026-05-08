import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coins, Download, Loader2, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { CommissionConfig } from "@/components/admin/CommissionConfig";
import { getCommissionsReport } from "@/server/admin.functions";

const MOCK_REPORT = {
  totalCommission: 184500,
  pending: 42000,
  avgRate: 12,
  rows: [
    { id: "m1", reference: "MB-1042", resto: "Chez Tantine",  city: "Douala",     gmv: 18000, rate: 12, commission: 2160, status: "delivered" },
    { id: "m2", reference: "MB-1043", resto: "Saveurs 237",   city: "Yaoundé",    gmv: 24500, rate: 12, commission: 2940, status: "pending"   },
    { id: "m3", reference: "MB-1044", resto: "Mami Nyanga",   city: "Douala",     gmv: 12000, rate: 10, commission: 1200, status: "delivered" },
    { id: "m4", reference: "MB-1045", resto: "Le Wouri Grill",city: "Douala",     gmv: 36000, rate: 12, commission: 4320, status: "pending"   },
    { id: "m5", reference: "MB-1046", resto: "Bafoussam Bites",city: "Bafoussam", gmv: 9500,  rate: 10, commission: 950,  status: "cancelled" },
  ],
};

export const Route = createFileRoute("/admin/commissions")({
  head: () => ({ meta: [{ title: "Commissions · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Commissions,
});

type Report = Awaited<ReturnType<typeof getCommissionsReport>>;

function Commissions() {
  const fetchReport = useServerFn(getCommissionsReport);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setError(null);
    return fetchReport()
      .then((r) => setReport(r && r.rows && r.rows.length > 0 ? r : (MOCK_REPORT as Report)))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur réseau");
        setReport(MOCK_REPORT as Report);
      });
  };

  const removeRow = (id: string) => {
    setReport((cur) => cur ? { ...cur, rows: cur.rows.filter((r: any) => r.id !== id) } : cur);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("admin-commissions")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => reload())
      .subscribe();
    const t = setInterval(reload, 60_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
    // eslint-disable-next-line
  }, []);

  const exportCsv = () => {
    if (!report) return;
    const header = "Reference,Restaurant,Ville,GMV,Taux,Commission,Statut\n";
    const body = report.rows.map((r) =>
      [r.reference, r.resto, r.city, r.gmv, r.rate, r.commission, r.status].join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `commissions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Commissions</h1>
          <p className="text-sm text-muted-foreground">Suivi des prélèvements MboaEats sur chaque commande · 7 derniers jours</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <CommissionConfig />

      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Données indisponibles ({error}). Affichage de données de démonstration.
        </div>
      )}
      {!report ? (
        <div className="flex justify-center p-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card label="Commissions générées (7j)" value={report.totalCommission.toLocaleString("fr-FR")} sub="FCFA" />
            <Card label="En attente" value={report.pending.toLocaleString("fr-FR")} sub="FCFA · commandes non livrées" />
            <Card label="Taux moyen effectif" value={`${report.avgRate}%`} sub="Sur GMV total" />
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-surface/60">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4 text-left">Commande</th>
                  <th className="p-4 text-left">Restaurant</th>
                  <th className="p-4 text-left">Ville</th>
                  <th className="p-4 text-right">GMV</th>
                  <th className="p-4 text-right">Taux</th>
                  <th className="p-4 text-right">Commission</th>
                  <th className="p-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.rows.map((r) => {
                  const tone = r.status === "delivered" ? "bg-emerald-500/15 text-emerald-400" :
                    r.status === "cancelled" || r.status === "refunded" ? "bg-red-500/15 text-red-400" :
                    "bg-gold/15 text-gold";
                  return (
                    <tr key={r.id} className="hover:bg-background/40">
                      <td className="p-4 font-mono text-xs">{r.reference}</td>
                      <td className="p-4 font-semibold">{r.resto}</td>
                      <td className="p-4 text-muted-foreground">{r.city}</td>
                      <td className="p-4 text-right">{r.gmv.toLocaleString("fr-FR")} F</td>
                      <td className="p-4 text-right">{r.rate}%</td>
                      <td className="p-4 text-right font-bold text-gradient-gold">{r.commission.toLocaleString("fr-FR")} F</td>
                      <td className="p-4 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{r.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {report.rows.length === 0 && (
                  <tr><td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">Aucune commande sur la période.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10">
        <Coins className="h-4 w-4 text-gold" />
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-gradient-gold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
