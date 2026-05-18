/**
 * MboaEats — Router config optimisée pour perf perçue.
 *
 * Patches vs version actuelle :
 *
 *   defaultPendingMs : 2000 → 200
 *     AVANT : l'utilisateur cliquait et ne voyait AUCUN feedback pendant 2s
 *     avant l'apparition d'un pendingComponent. Ressenti comme "freeze".
 *     APRÈS : 200ms — assez pour éviter le flash sur réseaux rapides,
 *     assez court pour donner un feedback visible sur 3G/4G mobile.
 *
 *   defaultPendingMinMs : 0 → 500
 *     Si un pending state s'affiche, il reste au minimum 500ms. Évite
 *     les "flash de spinner" qui sont visuellement pires que rien.
 *
 *   defaultStaleTime : 30s
 *     Les routes preloadées au survol restent fraîches 30s — un retour
 *     arrière dans cette fenêtre = render INSTANTANÉ depuis le cache.
 *
 *   defaultGcTime : 5min
 *     Conserve les données en mémoire 5min pour la navigation back/forward.
 *
 *   SUPPRESSION admin-bootstrap-redirect : ce script provoquait un rebond
 *     visuel et bloquait le scroll molette sur /admin. La logique de
 *     détection "aucun superadmin" est désormais gérée uniquement par la
 *     RPC has_any_superadmin dans SuperAdminLoginForm.tsx.
 */
import { createRouter, useRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useEffect } from "react";
import { routeTree } from "./routeTree.gen";
import { getHostMode } from "@/hooks/useHostMode";

/**
 * Isolation structurelle par sous-domaine.
 *
 * Exécutée SYNCHRONIQUEMENT avant createRouter() côté client : si l'URL
 * courante n'appartient pas au sous-arbre du host détecté, on réécrit
 * l'historique (replaceState) AVANT que le router ne lise `location`.
 *
 * → Aucun useEffect, aucune redirection après render, aucun flash de
 *   l'interface client sur admin.* ou restaurant.*.
 */
function bootstrapHostIsolation(): void {
  if (typeof window === "undefined") return;
  const host = window.location.hostname;
  const mode = getHostMode(host);
  const path = window.location.pathname;
  // Routes auth communes : autorisées sur tous les sous-domaines
  const isAuthPath =
    path === "/connexion" ||
    path === "/inscription" ||
    path === "/reset-password" ||
    path === "/healthcheck" ||
    path.startsWith("/admin/login") ||
    path.startsWith("/superadmin/login") ||
    path.startsWith("/admin/unauthorized");

  let target: string | null = null;
  if (mode === "admin") {
    const ok = path === "/admin" || path.startsWith("/admin/") ||
               path === "/superadmin" || path.startsWith("/superadmin/") ||
               isAuthPath;
    if (!ok) target = "/admin";
  } else if (mode === "restaurant") {
    const ok = path === "/restaurant" || path.startsWith("/restaurant/") || isAuthPath;
    if (!ok) target = "/restaurant";
  } else if (mode === "client") {
    // Sur le domaine client, on ne laisse PAS s'afficher /admin ou /restaurant
    // (ces espaces ne doivent vivre que sur leur sous-domaine).
    if (path === "/admin" || path.startsWith("/admin/") ||
        path === "/superadmin" || path.startsWith("/superadmin/") ||
        path === "/restaurant" || path.startsWith("/restaurant/")) {
      target = "/";
    }
  }

  console.log("[hostMode] hostname=", host, "mode=", mode, "path=", path,
              target ? `→ réécriture URL=${target}` : "→ OK");

  if (target) {
    window.history.replaceState(null, "", target);
  }
}

bootstrapHostIsolation();

const CHUNK_RELOAD_KEY = "__mboa_router_chunk_reload_at";

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Unable to preload CSS/i.test(msg)
  );
}

function tryAutoReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? "0");
    const now = Date.now();
    if (now - last < 30_000) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const chunkErr = isChunkLoadError(error);
  useEffect(() => {
    console.error("[Router error boundary]", error);
    if (chunkErr) {
      tryAutoReload();
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const key = "__mboa_router_retry_at";
      const last = Number(sessionStorage.getItem(key) ?? "0");
      const now = Date.now();
      if (now - last < 60_000) return;
      sessionStorage.setItem(key, String(now));
      const t = setTimeout(() => {
        try {
          router.invalidate();
          reset();
        } catch { /* ignore */ }
      }, 50);
      return () => clearTimeout(t);
    } catch { /* ignore */ }
  }, [error, chunkErr, router, reset]);
  if (chunkErr) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Mise à jour de l'application…</p>
      </main>
    );
  }
  const retry = () => {
    try {
      router.invalidate();
      reset();
    } catch { /* ignore */ }
  };
  const goHome = () => {
    try { reset(); } catch { /* ignore */ }
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Essayez à nouveau ou revenez à l'accueil.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={retry}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Réessayer
          </button>
          <button
            onClick={goHome}
            className="rounded-full border px-5 py-2 text-sm font-semibold"
          >
            Accueil
          </button>
        </div>
      </div>
    </div>
  );
}

function makeQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: "always",
        retry: 1,
      },
    },
  });
  if (typeof window !== "undefined") {
    try {
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: "mboa_rq_cache_v1",
        throttleTime: 1000,
      });
      persistQueryClient({
        queryClient: qc,
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            q.state.status === "success" && q.state.data !== undefined,
        },
      });
    } catch { /* ignore */ }
  }
  return qc;
}

export const getRouter = () => {
  const queryClient = makeQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: false,
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    defaultPreloadStaleTime: 30_000,
    defaultPendingMs: 200,
    defaultPendingMinMs: 500,
    defaultStaleTime: 30_000,
    defaultErrorComponent: DefaultErrorComponent,
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
