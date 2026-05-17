import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ShieldOff, ShieldCheck, RefreshCw } from "lucide-react";
import { listAllClients, setClientSuspended } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/clients")({
  head: () => ({
    meta: [
      { title: "Clients · Admin MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminClientsPage,
});

function AdminClientsPage() {
  const fetchClients = useServerFn(listAllClients);
  const suspendFn = useServerFn(setClientSuspended);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "clients", search],
    queryFn: () => fetchClients({ data: { search: search || undefined, limit: 200 } }),
  });

  const suspendMut = useMutation({
    mutationFn: (vars: { user_id: string; suspended: boolean; reason?: string }) =>
      suspendFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "clients"] }),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Clients</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Gestion des comptes utilisateurs · {data?.length ?? 0} compte(s)
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

      <div className="rounded-2xl border border-border bg-surface p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou téléphone…"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3 text-right">Commandes</th>
                <th className="px-4 py-3 text-right">GMV (FCFA)</th>
                <th className="px-4 py-3">Inscrit</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun client
                  </td>
                </tr>
              )}
              {data?.map((c) => (
                <tr key={c.user_id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{c.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{c.city ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.orders_count}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.gmv.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    {c.suspended ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Suspendu
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.suspended ? (
                      <button
                        disabled={suspendMut.isPending}
                        onClick={() => suspendMut.mutate({ user_id: c.user_id, suspended: false })}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Réactiver
                      </button>
                    ) : (
                      <button
                        disabled={suspendMut.isPending}
                        onClick={() => {
                          const reason = prompt("Motif de suspension (optionnel) :") ?? undefined;
                          suspendMut.mutate({ user_id: c.user_id, suspended: true, reason });
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
                      >
                        <ShieldOff className="h-3.5 w-3.5" /> Suspendre
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
