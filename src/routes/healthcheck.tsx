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

function HealthcheckPage() {
  const [backend, setBackend] = useState<Check>({ name: "Backend (DB)", status: "loading" });
  const [auth, setAuth] = useState<Check>({ name: "Authentification", status: "loading" });
  const [realtime, setRealtime] = useState<Check>({ name: "Temps réel (Realtime)", status: "loading" });
  const [routes, setRoutes] = useState<Check[]>(
    CRITICAL_ROUTES.map((r) => ({ name: r, status: "loading" }))
  );

  useEffect(() => {
    let cancelled = false;

    // Backend DB ping
    (async () => {
      const t0 = performance.now();
      const { error } = await supabase.from("restaurants").select("id", { head: true, count: "exact" }).limit(1);
      if (cancelled) return;
      const ms = Math.round(performance.now() - t0);
      setBackend({
        name: "Backend (DB)",
        status: error ? "error" : "ok",
        detail: error?.message,
        ms,
      });
    })();

    // Auth
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
    })();

    // Realtime
    const t0 = performance.now();
    const channel = supabase.channel("healthcheck-" + Date.now());
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setRealtime({
          name: "Temps réel (Realtime)",
          status: "error",
          detail: "Timeout après 8s",
        });
      }
    }, 8000);

    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        setRealtime({
          name: "Temps réel (Realtime)",
          status: "ok",
          detail: "Connecté",
          ms: Math.round(performance.now() - t0),
        });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        setRealtime({
          name: "Temps réel (Realtime)",
          status: "error",
          detail: status,
        });
      }
    });

    // Critical routes (HEAD requests)
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
        })
        .catch((err) => {
          if (cancelled) return;
          setRoutes((prev) => {
            const next = [...prev];
            next[idx] = { name: path, status: "error", detail: err.message };
            return next;
          });
        });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, []);

  const allChecks = [backend, auth, realtime, ...routes];
  const hasError = allChecks.some((c) => c.status === "error");
  const allLoading = allChecks.every((c) => c.status === "loading");
  const allOk = allChecks.every((c) => c.status === "ok");

  return (
    <div className="container max-w-2xl py-8 px-4 mb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">État du système</h1>
        <p className="text-sm text-muted-foreground">
          Vérification en temps réel du backend, de la connexion temps réel et des routes critiques.
        </p>
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
