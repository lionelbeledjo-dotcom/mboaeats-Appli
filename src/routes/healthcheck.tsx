import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/healthcheck")({
  component: HealthcheckPage,
  head: () => ({
    meta: [
      { title: "Healthcheck — MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Status = "loading" | "ok" | "error";

interface Check {
  name: string;
  status: Status;
  detail?: string;
  ms?: number;
}

const CRITICAL_ROUTES = [
  "/",
  "/decouvrir",
  "/recherche",
  "/commandes",
  "/profil",
  "/checkout",
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "loading")
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  return <XCircle className="h-5 w-5 text-destructive" />;
}

const REFRESH_INTERVAL_MS = 10_000;

function formatRelative(date: Date, now: number): string {
  const s = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  return date.toLocaleTimeString();
}


function HealthcheckPage() {
  const [backend, setBackend] = useState<Check>({ name: "Backend (DB)", status: "loading" });
  const [auth, setAuth] = useState<Check>({ name: "Authentification", status: "loading" });
  const [realtime, setRealtime] = useState<Check>({ name: "Temps réel (Realtime)", status: "loading" });
  const [routes, setRoutes] = useState<Check[]>(
    CRITICAL_ROUTES.map((r) => ({ name: r, status: "loading" }))
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef<() => void>(() => {});

  const runChecks = useCallback(() => {
    cancelRef.current();
    let cancelled = false;
    setRunning(true);

    let pending = 3 + CRITICAL_ROUTES.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0 && !cancelled) {
        setRunning(false);
        setLastChecked(new Date());
      }
    };

    (async () => {
      const t0 = performance.now();
      const { error } = await supabase
        .from("restaurants")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      if (cancelled) return;
      const ms = Math.round(performance.now() - t0);
      setBackend({
        name: "Backend (DB)",
        status: error ? "error" : "ok",
        detail: error?.message,
        ms,
      });
      done();
    })();

    (async () => {
      const t0 = performance.now();
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      const ms = Math.round(performance.now() - t0);
      setAuth({
        name: "Authentification",
        status: error ? "error" : "ok",
        detail: error?.message ?? (data.session ? "Session active" : "Anonyme"),
        ms,
      });
      done();
    })();

    const t0 = performance.now();
    const channel = supabase.channel("healthcheck-" + Date.now());
    let realtimeSettled = false;
    const settleRealtime = (next: Check) => {
      if (realtimeSettled || cancelled) return;
      realtimeSettled = true;
      setRealtime(next);
      done();
    };
    const timeout = setTimeout(() => {
      settleRealtime({
        name: "Temps réel (Realtime)",
        status: "error",
        detail: "Timeout après 8s",
      });
    }, 8000);

    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        settleRealtime({
          name: "Temps réel (Realtime)",
          status: "ok",
          detail: "Connecté",
          ms: Math.round(performance.now() - t0),
        });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        settleRealtime({
          name: "Temps réel (Realtime)",
          status: "error",
          detail: status,
        });
      }
    });

    CRITICAL_ROUTES.forEach((path, idx) => {
      const start = performance.now();
      fetch(path, { method: "HEAD", credentials: "same-origin" })
        .then((res) => {
          if (cancelled) return;
          const ms = Math.round(performance.now() - start);
          setRoutes((prev) => {
            const next = [...prev];
            next[idx] = {
              name: path,
              status: res.ok || res.status === 405 ? "ok" : "error",
              detail: `HTTP ${res.status}`,
              ms,
            };
            return next;
          });
          done();
        })
        .catch((err) => {
          if (cancelled) return;
          setRoutes((prev) => {
            const next = [...prev];
            next[idx] = { name: path, status: "error", detail: err.message };
            return next;
          });
          done();
        });
    });

    cancelRef.current = () => {
      cancelled = true;
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    runChecks();
    return () => cancelRef.current();
  }, [runChecks]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(runChecks, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, runChecks]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const allChecks = [backend, auth, realtime, ...routes];
  const hasError = allChecks.some((c) => c.status === "error");
  const allLoading = allChecks.every((c) => c.status === "loading");
  const allOk = allChecks.every((c) => c.status === "ok");

  const lastCheckedLabel = lastChecked
    ? formatRelative(lastChecked, nowTick)
    : "jamais";

  return (
    <div className="container max-w-2xl py-8 px-4 mb-24">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-2">État du système</h1>
          <p className="text-sm text-muted-foreground">
            Vérification en temps réel du backend, de la connexion temps réel et des routes critiques.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={runChecks} disabled={running} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${running ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
          <span>
            Dernière vérification : <span className="font-medium text-foreground">{lastCheckedLabel}</span>
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Rafraîchissement auto (10s)
        </label>
      </div>

      <div
        className={`mb-6 rounded-lg border p-4 flex items-center gap-3 ${
          allOk
            ? "border-green-600/30 bg-green-600/5"
            : hasError
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-muted/30"
        }`}
      >
        {allLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : allOk ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
        <div>
          <div className="font-medium">
            {allLoading
              ? "Vérification en cours…"
              : allOk
              ? "Tous les systèmes sont opérationnels"
              : "Un ou plusieurs systèmes rencontrent un problème"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Section title="Services" items={[backend, auth, realtime]} />
        <Section title="Routes critiques" items={routes} />
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: Check[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-2 border-b text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </div>
      <ul className="divide-y">
        {items.map((c) => (
          <li key={c.name} className="flex items-center gap-3 px-4 py-3">
            <StatusIcon status={c.status} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.name}</div>
              {c.detail && (
                <div className="text-xs text-muted-foreground truncate">{c.detail}</div>
              )}
            </div>
            {typeof c.ms === "number" && (
              <div className="text-xs text-muted-foreground tabular-nums">{c.ms} ms</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
