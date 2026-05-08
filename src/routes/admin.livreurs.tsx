import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bike, Phone, MapPin, Loader2, Power, PowerOff, Search, CheckCircle2, Circle, Clock, Eye, Pencil, Trash2, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listAllDrivers, setDriverStatus, setDriverActive, getDriverDetails, updateDriverProfile, deleteDriver } from "@/server/admin.functions";
import { ErrorState } from "@/components/admin/ErrorState";
import { Modal, Field, inputCls } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/livreurs")({
  head: () => ({ meta: [{ title: "Livreurs · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Livreurs,
});

type Driver = {
  id: string; name: string; phone: string | null; city: string | null;
  status: string; is_active: boolean; lat: number | null; lng: number | null;
  updated_at: string; courses: number; earned: number;
};

type Filter = "all" | "online" | "offline" | "inactive";

const NOW = new Date().toISOString();
const MOCK_DRIVERS: (Driver & { vehicle: string; from: string; to: string })[] = [
  { id: "mk-d1", name: "Samuel Mbappé", phone: "+237 6 91 12 34 56", city: "Douala", status: "busy", is_active: true, lat: 4.0511, lng: 9.7679, updated_at: NOW, courses: 32, earned: 48_500, vehicle: "Moto", from: "Akwa", to: "Logpom" },
  { id: "mk-d2", name: "Patrick Eyenga", phone: "+237 6 77 45 22 11", city: "Douala", status: "busy", is_active: true, lat: 4.0613, lng: 9.7510, updated_at: NOW, courses: 21, earned: 31_200, vehicle: "Moto", from: "Bonapriso", to: "Bonamoussadi" },
  { id: "mk-d3", name: "Christelle Nkomo", phone: "+237 6 55 88 90 12", city: "Douala", status: "available", is_active: true, lat: 4.0721, lng: 9.7398, updated_at: NOW, courses: 15, earned: 22_800, vehicle: "Vélo", from: "Bonanjo", to: "—" },
  { id: "mk-d4", name: "Jean-Marc Tchoumi", phone: "+237 6 22 11 33 99", city: "Douala", status: "busy", is_active: true, lat: 4.0468, lng: 9.7825, updated_at: NOW, courses: 28, earned: 42_000, vehicle: "Moto", from: "Deido", to: "Makepe" },
  { id: "mk-d5", name: "Éric Mbida", phone: "+237 6 78 65 43 21", city: "Douala", status: "busy", is_active: true, lat: 4.0397, lng: 9.7142, updated_at: NOW, courses: 19, earned: 27_600, vehicle: "Moto", from: "Youpwe", to: "New Bell" },
  { id: "mk-d6", name: "Brice Ondoa", phone: "+237 6 91 00 77 88", city: "Douala", status: "available", is_active: true, lat: 4.0892, lng: 9.7654, updated_at: NOW, courses: 11, earned: 16_400, vehicle: "Vélo", from: "Akwa Nord", to: "—" },
];

function Livreurs() {
  const fetchAll = useServerFn(listAllDrivers);
  const updateStatusFn = useServerFn(setDriverStatus);
  const setActiveFn = useServerFn(setDriverActive);
  const fetchDetails = useServerFn(getDriverDetails);
  const updateProfile = useServerFn(updateDriverProfile);
  const deleteFn = useServerFn(deleteDriver);
  const [list, setList] = useState<Driver[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Driver | null>(null);
  const [viewingData, setViewingData] = useState<any>(null);
  const [editing, setEditing] = useState<Driver | null>(null);

  const reload = () => {
    setError(null);
    setList(MOCK_DRIVERS as Driver[]);
    return Promise.resolve();
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("admin-drivers")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations" }, () => reload())
      .subscribe();
    const t = setInterval(reload, 15_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const all = list ?? [];
    return {
      all: all.length,
      online: all.filter((d) => d.is_active && d.status !== "offline").length,
      offline: all.filter((d) => d.is_active && d.status === "offline").length,
      inactive: all.filter((d) => !d.is_active).length,
    };
  }, [list]);

  const filtered = useMemo(() => {
    const all = list ?? [];
    const term = q.trim().toLowerCase();
    return all.filter((d) => {
      if (filter === "online" && !(d.is_active && d.status !== "offline")) return false;
      if (filter === "offline" && !(d.is_active && d.status === "offline")) return false;
      if (filter === "inactive" && d.is_active) return false;
      if (term && !`${d.name} ${d.phone ?? ""} ${d.city ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [list, filter, q]);

  async function changeStatus(id: string, status: "available" | "busy" | "offline") {
    setPendingId(id);
    try {
      await updateStatusFn({ data: { driver_id: id, status } });
      setList((prev) => prev?.map((d) => (d.id === id ? { ...d, status, updated_at: new Date().toISOString() } : d)) ?? null);
    } finally { setPendingId(null); }
  }

  async function toggleActive(d: Driver) {
    const next = !d.is_active;
    if (!confirm(next ? `Réactiver le livreur ${d.name} ?` : `Désactiver le livreur ${d.name} ? Il ne recevra plus d'offres.`)) return;
    setPendingId(d.id);
    try {
      await setActiveFn({ data: { driver_id: d.id, active: next } });
      setList((prev) => prev?.map((x) => (x.id === d.id ? { ...x, is_active: next, status: next ? "available" : "offline" } : x)) ?? null);
    } finally { setPendingId(null); }
  }

  async function openView(d: Driver) {
    setViewing(d);
    setViewingData(null);
    try { setViewingData(await fetchDetails({ data: { id: d.id } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  }

  async function handleDelete(d: Driver) {
    if (!confirm(`Supprimer DÉFINITIVEMENT le livreur ${d.name} ? Position et rôle seront effacés.`)) return;
    setPendingId(d.id);
    try {
      await deleteFn({ data: { id: d.id } });
      toast.success("Livreur supprimé");
      setList((prev) => prev?.filter((x) => x.id !== d.id) ?? null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setPendingId(null); }
  }

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: counts.all },
    { key: "online", label: "En ligne", count: counts.online },
    { key: "offline", label: "Hors ligne", count: counts.offline },
    { key: "inactive", label: "Désactivés", count: counts.inactive },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Livreurs</h1>
          <p className="text-sm text-muted-foreground">{counts.all} livreurs · {counts.online} en ligne · {counts.inactive} désactivés</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (nom, téléphone, ville)…"
            className="rounded-xl border border-border bg-surface/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filter === t.key ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "border border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {!list && !error && <div className="flex justify-center p-16"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="overflow-hidden rounded-3xl border border-border bg-surface/60">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Livreur</th>
              <th className="p-4 text-left">Véhicule</th>
              <th className="p-4 text-left">Course actuelle</th>
              <th className="p-4 text-right">Courses (7j)</th>
              <th className="p-4 text-right">Gains (7j)</th>
              <th className="p-4 text-center">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((d) => {
              const ago = Math.round((Date.now() - new Date(d.updated_at).getTime()) / 1000);
              const agoStr = ago < 60 ? `${ago}s` : ago < 3600 ? `${Math.round(ago/60)}min` : `${Math.round(ago/3600)}h`;
              const isPending = pendingId === d.id;
              return (
                <tr key={d.id} className={`hover:bg-background/40 ${!d.is_active ? "opacity-60" : ""}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                        <Bike className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.phone ?? "—"} · {d.city ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 font-semibold">
                      <Bike className="h-3 w-3" /> {(d as any).vehicle ?? "Moto"}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> il y a {agoStr}
                    </p>
                  </td>
                  <td className="p-4 text-xs">
                    {(d as any).from && (d as any).to && (d as any).to !== "—" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary">
                        <MapPin className="h-3 w-3" /> {(d as any).from} <span className="opacity-60">→</span> {(d as any).to}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Disponible · {(d as any).from ?? "—"}</span>
                    )}
                  </td>
                  <td className="p-4 text-right">{d.courses}</td>
                  <td className="p-4 text-right font-bold">{d.earned.toLocaleString("fr-FR")} F</td>
                  <td className="p-4 text-center">
                    {d.is_active ? (
                      <select
                        value={d.status}
                        onChange={(e) => changeStatus(d.id, e.target.value as "available" | "busy" | "offline")}
                        disabled={isPending}
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none ${
                          d.status === "busy" ? "bg-primary/15 text-primary" :
                          d.status === "available" ? "bg-emerald-500/15 text-emerald-400" :
                          "bg-surface text-muted-foreground"
                        }`}
                      >
                        <option value="available">Disponible</option>
                        <option value="busy">Occupé</option>
                        <option value="offline">Hors ligne</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-bold text-destructive">
                        <Circle className="h-3 w-3" /> Désactivé
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {d.phone && (
                        <a href={`tel:${d.phone}`} className="rounded-lg border border-border bg-background p-1.5 hover:border-primary" title="Appeler">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => openView(d)} disabled={isPending} className="rounded-lg border border-border bg-background p-1.5 hover:border-primary disabled:opacity-50" title="Voir">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditing(d)} disabled={isPending} className="rounded-lg border border-border bg-background p-1.5 hover:border-primary disabled:opacity-50" title="Éditer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(d)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                          d.is_active
                            ? "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                            : "bg-gradient-primary text-primary-foreground"
                        } disabled:opacity-50`}
                        title={d.is_active ? "Désactiver" : "Réactiver"}
                      >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                          d.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        {d.is_active ? "Désactiver" : "Réactiver"}
                      </button>
                      <button onClick={() => handleDelete(d)} disabled={isPending} className="rounded-lg border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 disabled:opacity-50" title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list && filtered.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">
                {counts.all === 0 ? "Aucun livreur enregistré pour l'instant." : "Aucun livreur ne correspond à ces filtres."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Mises à jour en temps réel via les positions des livreurs.
      </p>

      {viewing && (
        <Modal title={`Livreur · ${viewing.name}`} onClose={() => { setViewing(null); setViewingData(null); }}>
          {!viewingData ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Nom" value={viewingData.profile?.full_name ?? "—"} />
                <Info label="Téléphone" value={viewingData.profile?.phone ?? "—"} />
                <Info label="Ville" value={viewingData.profile?.city ?? "—"} />
                <Info label="Statut" value={viewingData.location?.status ?? "—"} />
                <Info label="Position" value={viewingData.location?.lat ? `${viewingData.location.lat.toFixed(4)}, ${viewingData.location.lng.toFixed(4)}` : "—"} />
                <Info label="Dernière maj" value={viewingData.location?.updated_at ? new Date(viewingData.location.updated_at).toLocaleString("fr-FR") : "—"} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dernières courses ({viewingData.orders?.length ?? 0})</p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {(viewingData.orders ?? []).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
                      <span className="font-mono">{o.reference}</span>
                      <span className="text-muted-foreground">{o.status}</span>
                      <span className="font-bold">{(o.delivery_fee ?? 0).toLocaleString("fr-FR")} F</span>
                    </div>
                  ))}
                  {(viewingData.orders ?? []).length === 0 && <p className="text-xs text-muted-foreground">Aucune course récente.</p>}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {editing && (
        <EditDriverModal
          driver={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updateProfile({ data: { id: editing.id, ...patch } });
            toast.success("Profil mis à jour");
            setList((prev) => prev?.map((x) => (x.id === editing.id ? { ...x, name: patch.full_name ?? x.name, phone: patch.phone ?? x.phone, city: patch.city ?? x.city } : x)) ?? null);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function EditDriverModal({ driver, onClose, onSave }: { driver: Driver; onClose: () => void; onSave: (patch: { full_name: string; phone: string | null; city: string | null }) => Promise<void> }) {
  const [full_name, setName] = useState(driver.name);
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [city, setCity] = useState(driver.city ?? "");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try { await onSave({ full_name, phone: phone || null, city: city || null }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={`Éditer · ${driver.name}`} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Annuler</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
        </button>
      </>
    }>
      <div className="space-y-4">
        <Field label="Nom complet"><input className={inputCls} value={full_name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Téléphone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Ville"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
