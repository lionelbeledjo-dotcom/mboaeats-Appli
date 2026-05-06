import { useEffect, useState } from "react";
import { Coins, Save, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { id: string; category: string; rate_pct: number; notes: string | null };

const labels: Record<string, string> = {
  restaurant: "Commission restaurant",
  livreur: "Reversement livreur",
  plateforme: "Frais de service plateforme",
};

export function CommissionConfig() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("commissions")
      .select("id,category,rate_pct,notes")
      .order("category")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        else setRows((data ?? []) as Row[]);
      });
    return () => { alive = false; };
  }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? rs);
  };

  const save = async (row: Row) => {
    setSavingId(row.id);
    setError(null);
    const { error } = await supabase
      .from("commissions")
      .update({ rate_pct: row.rate_pct, notes: row.notes })
      .eq("id", row.id);
    setSavingId(null);
    if (error) { setError(error.message); return; }
    setSavedId(row.id);
    setTimeout(() => setSavedId((s) => (s === row.id ? null : s)), 1500);
  };

  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-6">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Coins className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold">Configuration en direct</h2>
          <p className="text-xs text-muted-foreground">Modifier les taux appliqués aux nouvelles commandes.</p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {rows === null && Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
        {rows?.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {labels[r.category] ?? r.category}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <input
                type="number"
                step="0.5"
                min={0}
                max={100}
                value={r.rate_pct}
                onChange={(e) => update(r.id, { rate_pct: Number(e.target.value) })}
                className="w-24 rounded-xl border border-border bg-background px-3 py-2 font-display text-2xl font-bold text-gradient-gold outline-none focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <input
              value={r.notes ?? ""}
              onChange={(e) => update(r.id, { notes: e.target.value })}
              placeholder="Note interne"
              className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <button
              onClick={() => save(r)}
              disabled={savingId === r.id}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {savingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> :
                savedId === r.id ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
              {savingId === r.id ? "Sauvegarde…" : savedId === r.id ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
