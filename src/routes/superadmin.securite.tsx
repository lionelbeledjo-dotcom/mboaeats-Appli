import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, Lock, Unlock, Activity, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listLoginAttempts, unlockAccount } from "@/lib/security.functions";

export const Route = createFileRoute("/superadmin/securite")({
  component: SecurityPage,
  head: () => ({
    meta: [
      { title: "Sécurité plateforme · SuperAdmin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type WindowKey = "24h" | "7d" | "all";

function SecurityPage() {
  const fetchAttempts = useServerFn(listLoginAttempts);
  const unlockFn = useServerFn(unlockAccount);

  const [window, setWindow] = useState<WindowKey>("24h");
  const [data, setData] = useState<Awaited<ReturnType<typeof listLoginAttempts>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchAttempts({ data: { window, limit: 50 } })
      .then(setData)
      .catch((e) => toast.error(e?.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [fetchAttempts, window]);

  useEffect(() => { load(); }, [load]);

  const handleUnlock = async (email: string) => {
    setUnlocking(email);
    try {
      const r = await unlockFn({ data: { email } });
      toast.success(`${email} déverrouillé (${r.deleted} tentatives supprimées)`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec du déverrouillage");
    } finally {
      setUnlocking(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Sécurité plateforme</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Rafraîchir</span>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Activity className="h-5 w-5 text-orange-600" />}
          label="Tentatives échouées (24h)"
          value={data?.stats.failed_24h ?? "—"}
        />
        <StatCard
          icon={<Lock className="h-5 w-5 text-red-600" />}
          label="Comptes verrouillés actuellement"
          value={data?.stats.locked_count ?? "—"}
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5 text-emerald-600" />}
          label="Audit triggers actifs"
          value="✓ Pack 1"
        />
      </div>

      {/* Comptes verrouillés */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Comptes actuellement verrouillés</h2>
        <p className="text-sm text-muted-foreground">≥ 5 échecs dans les 5 dernières minutes</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          {!data?.locked.length ? (
            <p className="p-6 text-sm text-muted-foreground">Aucun compte verrouillé. ✨</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Échecs</th>
                  <th className="px-4 py-2 text-left">Verrouillé depuis</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.locked.map((l) => (
                  <tr key={l.email} className="border-t border-border">
                    <td className="px-4 py-2 font-mono">{l.email}</td>
                    <td className="px-4 py-2"><Badge variant="destructive">{l.failures}</Badge></td>
                    <td className="px-4 py-2">{new Date(l.since).toLocaleTimeString("fr-FR")}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlock(l.email)}
                        disabled={unlocking === l.email}
                      >
                        {unlocking === l.email
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Unlock className="h-3.5 w-3.5" />}
                        <span className="ml-1.5">Débloquer</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Tentatives récentes */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tentatives de connexion récentes</h2>
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            {(["24h", "7d", "all"] as WindowKey[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  window === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w === "all" ? "Tout" : w}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">IP</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">User-Agent</th>
              </tr>
            </thead>
            <tbody>
              {!data?.attempts.length && (
                <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Aucune tentative sur cette période.</td></tr>
              )}
              {data?.attempts.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2 whitespace-nowrap text-xs">{new Date(a.attempted_at).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.email}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.ip_address ?? "—"}</td>
                  <td className="px-4 py-2">
                    {a.success
                      ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Succès</Badge>
                      : <Badge variant="destructive">Échec</Badge>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-md truncate" title={a.user_agent ?? ""}>
                    {a.user_agent ?? "—"}
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
