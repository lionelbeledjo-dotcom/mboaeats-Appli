import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, LayoutDashboard, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/superadmin/")({
  component: SuperAdminHome,
});

function SuperAdminHome() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold">Console SUPER_ADMIN</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Espace réservé au propriétaire de la plateforme. Vous avez les droits maximums.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to="/admin" className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-card/80">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <p className="mt-3 font-semibold">Console Admin</p>
          <p className="text-xs text-muted-foreground">Pilotage opérationnel : commissions, restaurants, livreurs, litiges.</p>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-3 font-semibold">Sécurité plateforme</p>
          <p className="text-xs text-muted-foreground">Toutes les routes /superadmin/* sont protégées par un garde strict côté client et par les RLS côté base de données.</p>
        </div>
      </div>
    </div>
  );
}
