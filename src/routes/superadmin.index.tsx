import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bike, Crown, LayoutDashboard, Percent, ShieldCheck, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRestaurantsForModeration } from "@/server/restaurant.functions";
import { listDriverApplications } from "@/lib/driver-onboarding.functions";

export const Route = createFileRoute("/superadmin/")({
  component: SuperAdminHome,
});

function SuperAdminHome() {
  const fetchRestos = useServerFn(getRestaurantsForModeration);
  const fetchDrivers = useServerFn(listDriverApplications);
  const [pendingRestos, setPendingRestos] = useState<number | null>(null);
  const [pendingDrivers, setPendingDrivers] = useState<number | null>(null);

  useEffect(() => {
    fetchRestos({ data: { status: "pending" } })
      .then((r) => setPendingRestos(r?.counts?.pending ?? 0))
      .catch(() => setPendingRestos(null));
    fetchDrivers({ data: { status: "en_attente" } })
      .then((r) => setPendingDrivers(r?.applications?.length ?? 0))
      .catch(() => setPendingDrivers(null));
  }, [fetchRestos, fetchDrivers]);

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
        <Link
          to="/superadmin/restaurants"
          className="group relative rounded-2xl border border-border bg-card p-5 transition hover:border-emerald-400/60 hover:bg-card/80"
        >
          <Store className="h-5 w-5 text-emerald-600" />
          <p className="mt-3 font-semibold flex items-center gap-2">
            Modération restaurants
            {pendingRestos !== null && pendingRestos > 0 && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">{pendingRestos}</Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Validez ou refusez les demandes des restaurateurs partenaires.
          </p>
        </Link>
        <Link
          to="/superadmin/livreurs"
          className="group relative rounded-2xl border border-border bg-card p-5 transition hover:border-orange-400/60 hover:bg-card/80"
        >
          <Bike className="h-5 w-5 text-orange-600" />
          <p className="mt-3 font-semibold flex items-center gap-2">
            Modération livreurs
            {pendingDrivers !== null && pendingDrivers > 0 && (
              <Badge className="bg-orange-600 hover:bg-orange-600">{pendingDrivers}</Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Validez ou refusez les candidatures de livreurs.
          </p>
        </Link>
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

