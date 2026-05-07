import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, MessageCircle, Check, X, Clock, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listAllDisputes, resolveDispute } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/litiges")({
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

function Litiges() {
  const fetchAll = useServerFn(listAllDisputes);
  const doResolve = useServerFn(resolveDispute);
  const [items, setItems] = useState<Dispute[] | null>(null);

  const reload = () => fetchAll().then((r) => setItems(r.disputes as unknown as Dispute[])).catch(() => setItems([]));
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

  const open = (items ?? []).filter((i) => i.status === "open");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-3">
          Litiges <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400">{open.length}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Réclamations clients à traiter en temps réel</p>
      </div>

      {!items && <div className="flex justify-center p-16"><Loader2 className="h-5 w-5 animate-spin" /></div>}

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

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold hover:bg-surface">
                  <MessageCircle className="h-3.5 w-3.5" /> Contacter
                </button>
                <button onClick={() => handle(it.id, "resolved")} className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Résoudre
                </button>
                <button onClick={() => handle(it.id, "rejected")} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" /> Rejeter
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
    </div>
  );
}
