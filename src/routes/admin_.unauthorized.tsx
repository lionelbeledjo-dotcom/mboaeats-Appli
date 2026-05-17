import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/unauthorized")({
  component: UnauthorizedPage,
  head: () => ({
    meta: [
      { title: "Accès non autorisé · Mboa Console" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function UnauthorizedPage() {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    try { await supabase.auth.signOut({ scope: "global" }); } catch {}
    navigate({ to: "/admin/login", replace: true });
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="font-display text-3xl font-bold">Accès non autorisé</h1>
        <p className="text-sm text-muted-foreground">
          Votre compte n'a pas les permissions nécessaires pour accéder à la console d'administration MboaEats.
          Si vous pensez qu'il s'agit d'une erreur, contactez un administrateur.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
