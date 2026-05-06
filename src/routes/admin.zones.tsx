import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, Save, Loader2, Power, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/zones")({
  component: ZonesPage,
  head: () => ({
    meta: [
      { title: "Zones de livraison · Admin MboaEats" },
      { name: "description", content: "Gérez les zones, les frais et les ETA de livraison MboaEats." },
    ],
  }),
});

type Zone = {
  id: string;
  city: string;
  neighborhood: string;
  base_fee: number;
  eta_minutes: number;
  active: boolean;
};

type Setting = {
  key: string;
  value_int: number | null;
  description: string | null;
};

function ZonesPage() {
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ city: "Douala", neighborhood: "", base_fee: 1000, eta_minutes: 30 });

  const loadZones = async () => {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("id,city,neighborhood,base_fee,eta_minutes,active")
      .order("city").order("neighborhood");
    if (error) setError(error.message); else setZones((data ?? []) as Zone[]);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key,value_int,description")
      .order("key");
    if (error) setError(error.message); else setSettings((data ?? []) as Setting[]);
  };

  useEffect(() => { loadZones(); loadSettings(); }, []);

  const saveZone = async (z: Zone) => {
    setBusyId(z.id); setError(null);
    const { error } = await supabase
      .from("delivery_zones")
      .update({ base_fee: z.base_fee, eta_minutes: z.eta_minutes, active: z.active })
      .eq("id", z.id);
    setBusyId(null);
    if (error) setError(error.message);
  };

  const deleteZone = async (id: string) => {
    if (!confirm("Supprimer cette zone ?")) return;
    setBusyId(id); setError(null);
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    setBusyId(null);
    if (error) setError(error.message); else setZones((zs) => zs?.filter((x) => x.id !== id) ?? zs);
  };

  const addZone = async () => {
    if (!draft.neighborhood.trim()) return;
    setBusyId("__new__"); setError(null);
    const { data, error } = await supabase
      .from("delivery_zones")
      .insert({ ...draft, active: true })
      .select("id,city,neighborhood,base_fee,eta_minutes,active")
      .single();
    setBusyId(null);
    if (error) { setError(error.message); return; }
    setZones((zs) => [...(zs ?? []), data as Zone]);
    setDraft({ city: draft.city, neighborhood: "", base_fee: 1000, eta_minutes: 30 });
  };

  const saveSetting = async (s: Setting) => {
    setBusyKey(s.key); setError(null);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value_int: s.value_int })
      .eq("key", s.key);
    setBusyKey(null);
    if (error) setError(error.message);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Zones de livraison & prix</h1>
        <p className="text-sm text-muted-foreground">
          Gérez en temps réel les quartiers desservis, les frais de livraison et la tarification globale.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Platform pricing */}
      <section className="rounded-3xl border border-border bg-surface/60 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/10">
            <Settings className="h-4 w-4 text-gold" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Tarification globale</h2>
            <p className="text-xs text-muted-foreground">Variables appliquées à toutes les commandes.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {settings === null && Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
          {settings?.map((s) => (
            <div key={s.key} className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.key}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={s.value_int ?? 0}
                  onChange={(e) => setSettings((arr) =>
                    arr?.map((x) => x.key === s.key ? { ...x, value_int: Number(e.target.value) } : x) ?? arr
                  )}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-display text-lg font-bold text-gradient-gold outline-none focus:border-primary"
                />
                <button
                  onClick={() => saveSetting(s)}
                  disabled={busyKey === s.key}
                  aria-label="Enregistrer"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {busyKey === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Zones list */}
      <section className="rounded-3xl border border-border bg-surface/60 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Zones desservies</h2>
              <p className="text-xs text-muted-foreground">{zones?.length ?? "…"} quartiers actifs</p>
            </div>
          </div>
        </div>

        {/* Add new zone */}
        <div className="mt-5 grid gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 md:grid-cols-[120px_1fr_120px_120px_auto]">
          <select
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option>Douala</option>
            <option>Yaoundé</option>
            <option>Bafoussam</option>
          </select>
          <input
            value={draft.neighborhood}
            onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value })}
            placeholder="Quartier (ex: Akwa)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            value={draft.base_fee}
            onChange={(e) => setDraft({ ...draft, base_fee: Number(e.target.value) })}
            placeholder="Frais (F)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            value={draft.eta_minutes}
            onChange={(e) => setDraft({ ...draft, eta_minutes: Number(e.target.value) })}
            placeholder="ETA (min)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={addZone}
            disabled={busyId === "__new__"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {busyId === "__new__" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter
          </button>
        </div>

        {/* Zones table */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Ville</th>
                <th className="p-3 text-left">Quartier</th>
                <th className="p-3 text-right">Frais (FCFA)</th>
                <th className="p-3 text-right">ETA (min)</th>
                <th className="p-3 text-center">Actif</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zones === null && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="p-2"><Skeleton className="h-10 w-full rounded-xl" /></td>
                </tr>
              ))}
              {zones?.map((z) => (
                <tr key={z.id} className="hover:bg-background/40">
                  <td className="p-3 font-semibold">{z.city}</td>
                  <td className="p-3 text-muted-foreground">{z.neighborhood}</td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      value={z.base_fee}
                      onChange={(e) => setZones((zs) =>
                        zs?.map((x) => x.id === z.id ? { ...x, base_fee: Number(e.target.value) } : x) ?? zs
                      )}
                      className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      value={z.eta_minutes}
                      onChange={(e) => setZones((zs) =>
                        zs?.map((x) => x.id === z.id ? { ...x, eta_minutes: Number(e.target.value) } : x) ?? zs
                      )}
                      className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setZones((zs) =>
                        zs?.map((x) => x.id === z.id ? { ...x, active: !x.active } : x) ?? zs
                      )}
                      aria-label="Activer/Désactiver"
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                        z.active ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => saveZone(z)}
                        disabled={busyId === z.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                      >
                        {busyId === z.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Sauver
                      </button>
                      <button
                        onClick={() => deleteZone(z.id)}
                        aria-label="Supprimer"
                        className="inline-flex items-center justify-center rounded-lg border border-border px-2 py-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
