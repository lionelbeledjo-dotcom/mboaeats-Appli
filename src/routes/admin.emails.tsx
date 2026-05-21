import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Mail, RefreshCw, Search, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { listEmailSendLogs } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/emails")({
  head: () => ({
    meta: [
      { title: "Suivi emails · Admin MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminEmailsPage,
});

type Range = "24h" | "7d" | "30d" | "all";

function rangeToISO(range: Range): { from?: string; to?: string } {
  if (range === "all") return {};
  const now = new Date();
  const ms = range === "24h" ? 86400e3 : range === "7d" ? 7 * 86400e3 : 30 * 86400e3;
  return { from: new Date(now.getTime() - ms).toISOString(), to: now.toISOString() };
}

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  dlq: "bg-red-500/20 text-red-800 dark:text-red-400 border-red-500/40",
  bounced: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  suppressed: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  complained: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function AdminEmailsPage() {
  const fetchLogs = useServerFn(listEmailSendLogs);
  const [range, setRange] = useState<Range>("7d");
  const [template, setTemplate] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [tab, setTab] = useState<"list" | "orders">("list");

  const args = useMemo(() => {
    const r = rangeToISO(range);
    return {
      from: r.from,
      to: r.to,
      template: template || undefined,
      status: (status || undefined) as
        | "sent" | "pending" | "failed" | "dlq" | "suppressed" | "bounced" | "complained" | undefined,
      recipient: recipient || undefined,
      limit: 300,
    };
  }, [range, template, status, recipient]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "emails", args],
    queryFn: () => fetchLogs({ data: args }),
  });

  const stats = data?.stats ?? { total: 0, sent: 0, pending: 0, failed: 0, suppressed: 0 };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl">
            <Mail className="h-6 w-6 text-primary" /> Suivi emails
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Logs déduplicés par message · {stats.total} email(s) sur la période
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={<Mail className="h-4 w-4" />} tone="default" />
        <StatCard label="Envoyés" value={stats.sent} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <StatCard label="En attente" value={stats.pending} icon={<Clock className="h-4 w-4" />} tone="amber" />
        <StatCard label="Échecs / DLQ" value={stats.failed} icon={<XCircle className="h-4 w-4" />} tone="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3">
        <div className="inline-flex overflow-hidden rounded-xl border border-border">
          {(["24h", "7d", "30d", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"
              }`}
            >
              {r === "all" ? "Tout" : r}
            </button>
          ))}
        </div>

        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="h-10 min-w-[200px] rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Tous les templates</option>
          {data?.templates?.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 min-w-[140px] rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Tous statuts</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="dlq">DLQ</option>
          <option value="suppressed">Suppressed</option>
          <option value="bounced">Bounced</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Destinataire (ex: lbprestige…)"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => setRecipient("lbprestigeappart@gmail.com")}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
          title="Filtrer sur le compte de test"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Compte test
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex overflow-hidden rounded-xl border border-border">
        <button
          onClick={() => setTab("list")}
          className={`px-4 py-2 text-sm font-semibold ${tab === "list" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"}`}
        >
          Tous les envois
        </button>
        <button
          onClick={() => setTab("orders")}
          className={`px-4 py-2 text-sm font-semibold ${tab === "orders" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"}`}
        >
          Par commande
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : tab === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Destinataire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun email</td></tr>
                )}
                {data?.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.template_name}</td>
                    <td className="px-4 py-3 text-xs">{r.recipient_email}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400">{r.error_message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.orders ?? []).length === 0 && (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
              Aucune commande associée aux emails de la période
            </div>
          )}
          {data?.orders.map((o) => (
            <div key={o.order_id} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{o.reference}</span>
                  <span className="text-xs text-muted-foreground">{o.emails.length} email(s)</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{fmt(o.emails[0]!.created_at)}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {o.emails.map((e) => (
                    <tr key={e.id} className="border-t border-border first:border-t-0">
                      <td className="px-4 py-2 font-mono text-xs">{e.template_name}</td>
                      <td className="px-4 py-2 text-xs">{e.recipient_email}</td>
                      <td className="px-4 py-2"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{fmt(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, tone,
}: { label: string; value: number; icon: React.ReactNode; tone: "default" | "green" | "amber" | "red" }) {
  const toneCls = {
    default: "border-border bg-surface",
    green: "border-emerald-500/30 bg-emerald-500/10",
    amber: "border-amber-500/30 bg-amber-500/10",
    red: "border-red-500/30 bg-red-500/10",
  }[tone];
  const iconTone = {
    default: "text-muted-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${toneCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={iconTone}>{icon}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold">{value}</div>
    </div>
  );
}
