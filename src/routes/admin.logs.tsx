import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { listAuditLogs } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({
    meta: [
      { title: "Logs activité · Admin MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLogsPage,
});

function AdminLogsPage() {
  const fetchLogs = useServerFn(listAuditLogs);
  const [action, setAction] = useState("");
  const [table, setTable] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "logs", action, table],
    queryFn: () => fetchLogs({ data: { action: action || undefined, table: table || undefined, limit: 200 } }),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Logs activité</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Audit trail plateforme · {data?.length ?? 0} entrée(s)
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
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Action (ex: restaurant.updated)"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <input
          value={table}
          onChange={(e) => setTable(e.target.value)}
          placeholder="Table (ex: orders)"
          className="h-10 min-w-[160px] rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Acteur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Cible</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Chargement…</td></tr>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun log</td></tr>
              )}
              {data?.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.occurred_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-xs">{l.actor_name ?? l.actor_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{l.actor_role ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.target_table}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{l.target_id?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
