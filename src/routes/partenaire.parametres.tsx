import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getRestaurant, updateRestaurant } from "@/lib/restaurant.functions";
import { usePartenaire } from "@/components/partenaire/PartenaireContext";

export const Route = createFileRoute("/partenaire/parametres")({
  component: ParametresPage,
});

type Form = {
  name: string; cuisine: string; neighborhood: string;
  eta_min: number; eta_max: number;
  delivery_fee: number; min_order: number; is_open: boolean;
};

function ParametresPage() {
  const { active, reload: reloadCtx } = usePartenaire();
  const fetchResto = useServerFn(getRestaurant);
  const update = useServerFn(updateRestaurant);

  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchResto({ data: { restaurant_id: active.id } }).then((r) => {
      if (!alive) return;
      const x = r.restaurant as any;
      setForm({
        name: x.name ?? "", cuisine: x.cuisine ?? "",
        neighborhood: x.neighborhood ?? "",
        eta_min: x.eta_min ?? 20, eta_max: x.eta_max ?? 40,
        delivery_fee: x.delivery_fee ?? 0, min_order: x.min_order ?? 0,
        is_open: !!x.is_open,
      });
    });
    return () => { alive = false; };
  }, [fetchResto, active.id]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await update({
        data: {
          restaurant_id: active.id,
          name: form.name, cuisine: form.cuisine,
          neighborhood: form.neighborhood || null,
          eta_min: form.eta_min, eta_max: form.eta_max,
          delivery_fee: form.delivery_fee, min_order: form.min_order,
          is_open: form.is_open,
        },
      });
      toast.success("Paramètres enregistrés");
      await reloadCtx();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally { setSaving(false); }
  };

  if (!form) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 font-display text-2xl font-bold">Paramètres</h1>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <Field label="Nom du restaurant" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Type de cuisine" value={form.cuisine} onChange={(v) => setForm({ ...form, cuisine: v })} />
        <Field label="Quartier" value={form.neighborhood} onChange={(v) => setForm({ ...form, neighborhood: v })} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Délai min (mn)" type="number" value={String(form.eta_min)}
            onChange={(v) => setForm({ ...form, eta_min: parseInt(v) || 0 })} />
          <Field label="Délai max (mn)" type="number" value={String(form.eta_max)}
            onChange={(v) => setForm({ ...form, eta_max: parseInt(v) || 0 })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Frais de livraison (FCFA)" type="number" value={String(form.delivery_fee)}
            onChange={(v) => setForm({ ...form, delivery_fee: parseInt(v) || 0 })} />
          <Field label="Commande min (FCFA)" type="number" value={String(form.min_order)}
            onChange={(v) => setForm({ ...form, min_order: parseInt(v) || 0 })} />
        </div>

        <label className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3">
          <span className="text-sm font-semibold">Restaurant ouvert aux commandes</span>
          <input
            type="checkbox"
            checked={form.is_open}
            onChange={(e) => setForm({ ...form, is_open: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
