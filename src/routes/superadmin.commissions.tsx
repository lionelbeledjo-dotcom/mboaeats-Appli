import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Percent, Save, ArrowLeft, Info } from "lucide-react";
import {
  getCommissionOverview,
  updateDefaultCommission,
} from "@/lib/commissions.functions";

export const Route = createFileRoute("/superadmin/commissions")({
  component: SuperAdminCommissions,
  head: () => ({ meta: [{ title: "Commissions · Super Admin" }] }),
});

function SuperAdminCommissions() {
  const fetchOverview = useServerFn(getCommissionOverview);
  const saveRate = useServerFn(updateDefaultCommission);
  const [rate, setRate] = useState<string>("");
  const [stats, setStats] = useState<{ total: number; overrides: number; atDefault: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchOverview()
      .then((r) => {
        setRate(String(r.defaultRate));
        setStats(r.stats);
      })
      .catch((e) => toast.error(e?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSave = async () => {
    const n = Number(rate);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast.error("Taux invalide (0 à 100)");
      return;
    }
    setSaving(true);
    try {
      await saveRate({ data: { rate_pct: n } });
      toast.success("Taux global mis à jour");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/superadmin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Console
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Percent className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Commissions MboaEats</h1>
          <p className="text-sm text-muted-foreground">
            Taux global appliqué sur le sous-total (plats), hors livraison.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Taux global par défaut
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <input
            type="number"
            step="0.5"
            min={0}
            max={100}
            value={rate}
            disabled={loading}
            onChange={(e) => setRate(e.target.value)}
            className="w-32 rounded-xl border border-border bg-background px-3 py-2 font-display text-3xl font-bold text-primary outline-none focus:border-primary"
          />
          <span className="text-lg text-muted-foreground">%</span>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/30 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Le nouveau taux s'appliquera <strong>uniquement aux futures commandes</strong>. Les
            commandes existantes conservent leur calcul d'origine (commission figée à la création).
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={saving || loading}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde…" : "Enregistrer"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Restaurants total" value={stats?.total ?? "—"} />
        <StatCard label="Au taux par défaut" value={stats?.atDefault ?? "—"} />
        <StatCard label="Avec override" value={stats?.overrides ?? "—"} accent />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Pour configurer un override par restaurant, rendez-vous sur la page{" "}
        <Link to="/superadmin/restaurants" className="underline">Modération restaurants</Link>.
      </p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
