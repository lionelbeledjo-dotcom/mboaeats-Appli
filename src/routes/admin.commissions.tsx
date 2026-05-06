import { createFileRoute } from "@tanstack/react-router";
import { Coins, Download, Filter } from "lucide-react";
import { CommissionConfig } from "@/components/admin/CommissionConfig";

export const Route = createFileRoute("/admin/commissions")({
  component: Commissions,
});

const rows = [
  { id: "MBE-2841", resto: "Chez Mama Biya", city: "Douala", gmv: 12500, rate: 12, status: "Payé" },
  { id: "MBE-2840", resto: "Saveurs du Mboa", city: "Douala", gmv: 8400, rate: 12, status: "Payé" },
  { id: "MBE-2839", resto: "Le Wouri Grill", city: "Douala", gmv: 18600, rate: 15, status: "En attente" },
  { id: "MBE-2838", resto: "Suya King", city: "Yaoundé", gmv: 5200, rate: 10, status: "Payé" },
  { id: "MBE-2837", resto: "Ndolé Express", city: "Bafoussam", gmv: 7800, rate: 12, status: "Litige" },
];

function Commissions() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Commissions</h1>
          <p className="text-sm text-muted-foreground">Suivi des prélèvements MboaEats sur chaque commande</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm">
            <Filter className="h-4 w-4" /> Filtrer
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <CommissionConfig />

      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Commissions encaissées" value="4 820 000" sub="FCFA · 7j" />
        <Card label="En attente" value="312 500" sub="FCFA · 18 commandes" />
        <Card label="Taux moyen" value="12.6%" sub="Sur GMV total" />
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
            {rows.map((r) => {
              const com = Math.round((r.gmv * r.rate) / 100);
              const tone = r.status === "Payé" ? "bg-emerald-500/15 text-emerald-400" :
                r.status === "Litige" ? "bg-red-500/15 text-red-400" : "bg-gold/15 text-gold";
              return (
                <tr key={r.id} className="hover:bg-background/40">
                  <td className="p-4 font-mono text-xs">{r.id}</td>
                  <td className="p-4 font-semibold">{r.resto}</td>
                  <td className="p-4 text-muted-foreground">{r.city}</td>
                  <td className="p-4 text-right">{r.gmv.toLocaleString("fr-FR")} F</td>
                  <td className="p-4 text-right">{r.rate}%</td>
                  <td className="p-4 text-right font-bold text-gradient-gold">{com.toLocaleString("fr-FR")} F</td>
                  <td className="p-4 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
