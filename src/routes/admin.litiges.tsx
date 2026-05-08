import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, MessageCircle, Check, X, Clock, Loader2, Eye, Pencil, Trash2, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listAllDisputes, resolveDispute, getDisputeDetails, updateDispute, deleteDispute } from "@/server/admin.functions";
import { ErrorState } from "@/components/admin/ErrorState";
import { Modal, Field, inputCls } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/litiges")({
  head: () => ({ meta: [{ title: "Litiges · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Litiges,
});

type Dispute = {
  id: string; order_id: string; reason: string; description: string | null;
  amount: number; priority: string; status: string; created_at: string;
  orders?: { reference: string; total: number } | null;
  restaurants?: { name: string } | null;
};

function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} j`;
}

const MOCK_DISPUTES: Dispute[] = [
  { id: "mk1", order_id: "abcdef0123", reason: "Plat froid à la livraison", description: "Le client se plaint que le plat est arrivé froid après 50 min d'attente.", amount: 8500,  priority: "high",   status: "open", created_at: new Date(Date.now() - 35 * 60_000).toISOString(),         orders: { reference: "MB-2031", total: 8500  }, restaurants: { name: "Chez Tantine" } },
  { id: "mk2", order_id: "abcdef0124", reason: "Livraison tardive",         description: "Plus d'1h de retard sans notification.",                                          amount: 5200,  priority: "medium", status: "open", created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),       orders: { reference: "MB-2032", total: 5200  }, restaurants: { name: "Saveurs 237" } },
  { id: "mk3", order_id: "abcdef0125", reason: "Article manquant",          description: "Boisson absente du sac.",                                                          amount: 1500,  priority: "low",    status: "open", created_at: new Date(Date.now() - 4 * 3600_000).toISOString(),       orders: { reference: "MB-2033", total: 12000 }, restaurants: { name: "Mami Nyanga" } },
  { id: "mk4", order_id: "abcdef0126", reason: "Erreur de commande",        description: "Plat livré ne correspond pas.",                                                    amount: 6700,  priority: "medium", status: "open", created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),      orders: { reference: "MB-2034", total: 6700  }, restaurants: { name: "Le Wouri Grill" } },
];

function Litiges() {
  const fetchAll = useServerFn(listAllDisputes);
  const doResolve = useServerFn(resolveDispute);
  const fetchDetails = useServerFn(getDisputeDetails);
  const updateFn = useServerFn(updateDispute);
  const deleteFn = useServerFn(deleteDispute);
  const [items, setItems] = useState<Dispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Dispute | null>(null);
  const [viewingData, setViewingData] = useState<any>(null);
  const [editing, setEditing] = useState<Dispute | null>(null);

  const reload = () => {
    setError(null);
    return fetchAll()
      .then((r) => {
        const list = (r.disputes ?? []) as unknown as Dispute[];
        setItems(list.length > 0 ? list : MOCK_DISPUTES);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur réseau");
        setItems(MOCK_DISPUTES);
      });
  };
  useEffect(() => {
    reload();
    const ch = supabase
      .channel("admin-disputes")
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, []);

  const handle = async (id: string, status: "resolved" | "rejected") => {
    try {
      await doResolve({ data: { id, status } });
      toast.success(status === "resolved" ? "Litige résolu" : "Litige rejeté");
      reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };

  const openView = async (it: Dispute) => {
    setViewing(it);
    setViewingData(null);
    try { setViewingData(await fetchDetails({ data: { id: it.id } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };

  const handleDelete = async (it: Dispute) => {
    if (!confirm(`Supprimer le litige #${it.orders?.reference ?? it.order_id.slice(0, 8)} ?`)) return;
    if (it.id.startsWith("mk")) {
      setItems((prev) => prev?.filter((x) => x.id !== it.id) ?? null);
      toast.success("Litige supprimé (démo)");
      return;
    }
    try {
      await deleteFn({ data: { id: it.id } });
      toast.success("Litige supprimé");
      setItems((prev) => prev?.filter((x) => x.id !== it.id) ?? null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };

  const open = (items ?? []).filter((i) => i.status === "open");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-3">
          Litiges <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400">{open.length}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Réclamations clients à traiter en temps réel</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Données indisponibles ({error}). Affichage de litiges de démonstration.
        </div>
      )}
      {!items && !error && <div className="flex justify-center p-16"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="grid gap-4 md:grid-cols-2">
        {open.map((it) => {
          const tone = it.priority === "high" ? "border-red-500/40 bg-red-500/5" :
            it.priority === "medium" ? "border-gold/40 bg-gold/5" : "border-border bg-surface/60";
          return (
            <div key={it.id} className={`rounded-3xl border p-5 ${tone}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">#{it.orders?.reference ?? it.order_id.slice(0, 8)}</p>
                    <p className="font-display font-bold">{it.reason}</p>
                  </div>
                </div>
                <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase">{it.priority}</span>
              </div>

              {it.description && <p className="mt-3 text-sm text-muted-foreground">{it.description}</p>}

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Restaurant</p>
                  <p className="font-semibold">{it.restaurants?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Montant en cause</p>
                  <p className="font-bold text-gradient-gold">{it.amount.toLocaleString("fr-FR")} FCFA</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Ouvert</p>
                  <p className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3" /> il y a {timeAgo(it.created_at)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => handle(it.id, "resolved")} className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Résoudre
                </button>
                <button onClick={() => handle(it.id, "rejected")} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" /> Rejeter
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button onClick={() => openView(it)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold hover:bg-surface">
                  <Eye className="h-3.5 w-3.5" /> Voir
                </button>
                <button onClick={() => setEditing(it)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold hover:bg-surface">
                  <Pencil className="h-3.5 w-3.5" /> Éditer
                </button>
                <button onClick={() => handleDelete(it)} className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 py-2 text-xs font-bold text-destructive hover:bg-destructive/20">
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </div>
            </div>
          );
        })}
        {items && open.length === 0 && (
          <div className="md:col-span-2 rounded-3xl border border-dashed border-border bg-surface/30 p-10 text-center">
            <Check className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-2 font-display text-lg font-bold">Aucun litige ouvert 🎉</p>
            <p className="text-sm text-muted-foreground">Tous les clients sont satisfaits pour le moment.</p>
          </div>
        )}
      </div>

      {viewing && (
        <Modal title={`Litige · ${viewing.reason}`} onClose={() => { setViewing(null); setViewingData(null); }}>
          {!viewingData ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <DInfo label="Statut" value={viewingData.dispute.status} />
                <DInfo label="Priorité" value={viewingData.dispute.priority} />
                <DInfo label="Montant" value={`${(viewingData.dispute.amount ?? 0).toLocaleString("fr-FR")} FCFA`} />
                <DInfo label="Créé" value={new Date(viewingData.dispute.created_at).toLocaleString("fr-FR")} />
                <DInfo label="Commande" value={viewingData.order?.reference ?? "—"} />
                <DInfo label="Restaurant" value={viewingData.restaurant?.name ?? "—"} />
                <DInfo label="Client" value={viewingData.client?.full_name ?? "—"} />
                <DInfo label="Tél. client" value={viewingData.client?.phone ?? "—"} />
              </div>
              {viewingData.dispute.description && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="rounded-xl border border-border bg-background/40 p-3">{viewingData.dispute.description}</p>
                </div>
              )}
              {viewingData.dispute.resolution && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Résolution</p>
                  <p className="rounded-xl border border-border bg-background/40 p-3">{viewingData.dispute.resolution}</p>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {editing && (
        <EditDisputeModal
          dispute={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updateFn({ data: { id: editing.id, ...patch } });
            toast.success("Litige mis à jour");
            setItems((prev) => prev?.map((x) => (x.id === editing.id ? { ...x, ...patch } as Dispute : x)) ?? null);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function DInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function EditDisputeModal({ dispute, onClose, onSave }: { dispute: Dispute; onClose: () => void; onSave: (patch: { reason: string; priority: "low" | "medium" | "high"; amount: number; description: string | null }) => Promise<void> }) {
  const [reason, setReason] = useState(dispute.reason);
  const [priority, setPriority] = useState<"low" | "medium" | "high">((dispute.priority as any) ?? "medium");
  const [amount, setAmount] = useState(dispute.amount ?? 0);
  const [description, setDescription] = useState(dispute.description ?? "");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try { await onSave({ reason, priority, amount: Number(amount) || 0, description: description || null }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  };
  return (
    <Modal title="Éditer le litige" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Annuler</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
        </button>
      </>
    }>
      <div className="space-y-4">
        <Field label="Motif"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priorité">
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as any)}>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </Field>
          <Field label="Montant (FCFA)"><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        </div>
        <Field label="Description"><textarea rows={4} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
