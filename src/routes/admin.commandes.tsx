import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, X as XIcon, RefreshCw } from "lucide-react";
import { listAllOrders, cancelOrderAsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/commandes")({
  head: () => ({
    meta: [
      { title: "Commandes · Admin MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminOrdersPage,
});

const STATUSES = [
  { value: "all", label: "Toutes" },
  { value: "pending_payment", label: "Paiement en attente" },
  { value: "paid", label: "Payées" },
  { value: "accepted", label: "Acceptées" },
  { value: "preparing", label: "En préparation" },
  { value: "ready", label: "Prêtes" },
  { value: "picked_up", label: "Récupérées" },
  { value: "delivering", label: "En livraison" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
];

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-amber-500/15 text-amber-700",
  paid: "bg-blue-500/15 text-blue-700",
  accepted: "bg-indigo-500/15 text-indigo-700",
  preparing: "bg-violet-500/15 text-violet-700",
  ready: "bg-cyan-500/15 text-cyan-700",
  picked_up: "bg-sky-500/15 text-sky-700",
  delivering: "bg-orange-500/15 text-orange-700",
  delivered: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-red-500/15 text-red-700",
};

function AdminOrdersPage() {
  const fetchOrders = useServerFn(listAllOrders);
  const cancelFn = useServerFn(cancelOrderAsAdmin);
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "orders", status, search],
    queryFn: () => fetchOrders({ data: { status, search: search || undefined, limit: 100 } }),
  });

  const cancelMut = useMutation({
    mutationFn: (order_id: string) => cancelFn({ data: { order_id, reason: "Annulation admin" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Commandes</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Vue globale plateforme · {data?.length ?? 0} commande(s)
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-muted/50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Référence (MBE-...)"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Réf</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Aucune commande
                  </td>
                </tr>
              )}
              {data?.map((o) => {
                const canCancel = !["delivered", "cancelled"].includes(o.status as string);
                return (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-xs">{o.reference}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.client?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.client?.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.restaurant?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.restaurant?.city ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status as string] ?? "bg-muted text-foreground"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{(o.total ?? 0).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canCancel && (
                        <button
                          disabled={cancelMut.isPending}
                          onClick={() => {
                            if (confirm(`Annuler la commande ${o.reference} ?`)) cancelMut.mutate(o.id);
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                        >
                          <XIcon className="h-3.5 w-3.5" /> Annuler
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
