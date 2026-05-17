import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Store, ChefHat, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listMyRestaurants } from "@/server/restaurant.functions";
import { PartenaireCtx, type PartenaireResto } from "@/components/partenaire/PartenaireContext";
import { PartenaireShell } from "@/components/partenaire/PartenaireShell";

export const Route = createFileRoute("/partenaire")({
  component: PartenaireLayout,
  head: () => ({
    meta: [
      { title: "Espace Partenaire · MboaEats" },
      { name: "description", content: "Tableau de bord restaurateur — gérez vos menus, commandes et revenus." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const ACTIVE_KEY = "mboa.partenaire.activeResto";

function PartenaireLayout() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listMyRestaurants);

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [restos, setRestos] = useState<PartenaireResto[] | null>(null);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setAuthReady(true);
    });
  }, []);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const r = await fetchList();
      // Aplatissement : extraire role depuis members[0]
      const list: PartenaireResto[] = (r.restaurants ?? []).map((x: any) => ({
        id: x.id,
        name: x.name,
        slug: x.slug,
        cuisine: x.cuisine ?? null,
        city: x.city ?? null,
        neighborhood: x.neighborhood ?? null,
        image_url: x.image_url ?? null,
        is_open: x.is_open ?? null,
        is_active: x.is_active ?? null,
        role: (x.members?.[0]?.role ?? "kitchen") as PartenaireResto["role"],
      }));
      setRestos(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setRestos([]);
    }
  }, [fetchList]);

  useEffect(() => {
    if (signedIn) reload();
  }, [signedIn, reload]);

  // Hydrate activeId depuis localStorage / défaut
  useEffect(() => {
    if (!restos || restos.length === 0) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_KEY) : null;
    const validated = restos.find((r) => r.id === stored)?.id ?? null;
    setActiveIdState(validated ?? restos[0].id);
  }, [restos]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    try { window.localStorage.setItem(ACTIVE_KEY, id); } catch {}
  }, []);

  const active = useMemo(
    () => (restos && activeId ? restos.find((r) => r.id === activeId) ?? null : null),
    [restos, activeId],
  );

  // États
  if (!authReady) return <FullscreenLoader />;

  if (!signedIn) {
    return (
      <CenterBox
        icon={Store}
        title="Espace Partenaire"
        body="Connectez-vous pour accéder à votre tableau de bord restaurateur."
        action={
          <button
            onClick={() => navigate({ to: "/connexion" })}
            className="rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Se connecter
          </button>
        }
      />
    );
  }

  if (restos === null) return <FullscreenLoader />;

  if (error) {
    return (
      <CenterBox
        icon={Store}
        title="Erreur de chargement"
        body={error}
        action={
          <button onClick={reload} className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold">
            Réessayer
          </button>
        }
      />
    );
  }

  if (restos.length === 0) {
    return (
      <CenterBox
        icon={ChefHat}
        title="Aucun restaurant rattaché"
        body="Votre compte n'est associé à aucun restaurant partenaire. Inscrivez votre établissement pour commencer."
        action={
          <Link
            to="/devenir-resto"
            className="rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Devenir restaurateur
          </Link>
        }
      />
    );
  }

  // Statut "en attente de validation" : aucun resto actif
  const anyActive = restos.some((r) => r.is_active);
  if (!anyActive) {
    return (
      <CenterBox
        icon={Clock}
        title="Compte en attente de validation"
        body="Votre compte est en attente de validation par l'administration. Vous recevrez une notification dès qu'il sera activé."
        action={
          <Link to="/" className="text-sm font-semibold text-primary hover:underline">
            Retour à l'accueil
          </Link>
        }
      />
    );
  }

  if (!active) return <FullscreenLoader />;

  // Si l'actif n'est pas validé mais d'autres le sont, force le switch
  if (!active.is_active) {
    const firstActive = restos.find((r) => r.is_active)!;
    setActiveId(firstActive.id);
    return <FullscreenLoader />;
  }

  return (
    <PartenaireCtx.Provider value={{ restos, active, setActiveId, reload }}>
      <PartenaireShell>
        <Outlet />
      </PartenaireShell>
    </PartenaireCtx.Provider>
  );
}

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function CenterBox({
  icon: Icon, title, body, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </div>
  );
}
