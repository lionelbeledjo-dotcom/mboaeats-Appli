/**
 * MboaEats — RoleGuard (rétrocompatibilité).
 *
 * @deprecated Préférez les composants `<RequirePlatformAdmin>`,
 *   `<RequireMembership>`, `<RequireDriver>` du module `@/auth/components/RequireRole`.
 *
 * Ce composant garde la signature publique de l'ancien RoleGuard pour ne pas
 * casser les routes qui l'importent. Il route en interne vers le bon
 * Require* selon `role`.
 */

import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { useSession } from "@/auth/hooks/useSession";
import { useCurrentRestaurantId } from "@/auth/hooks/useCurrentRestaurant";
import type { AppRole } from "@/hooks/useUserRoles";

interface Props {
  role: AppRole;
  children: ReactNode;
  ctaTo: string;
  ctaLabel: string;
  title: string;
  description: string;
}

export function RoleGuard({
  role,
  children,
  ctaTo,
  ctaLabel,
  title,
  description,
}: Props) {
  const {
    isLoading,
    isAuthenticated,
    isPlatformAdmin,
    isPlatformSuperadmin,
    isDriver,
    hasMembership,
  } = useSession();
  const restaurantId = useCurrentRestaurantId();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <GuardCard
        title="Connexion requise"
        description="Connectez-vous pour accéder à cet espace."
        ctaTo="/connexion"
        ctaLabel="Se connecter"
      />
    );
  }

  // Résolution du droit selon le rôle demandé
  let allowed = false;
  switch (role) {
    case "client":
      allowed = isAuthenticated;
      break;
    case "livreur":
      allowed = isDriver;
      break;
    case "admin":
      allowed = isPlatformAdmin;
      break;
    case "superadmin":
      allowed = isPlatformSuperadmin;
      break;
    case "restaurateur":
      // Anciennement = "ce user est rattaché à un resto". Maintenant on
      // vérifie qu'il a AU MOINS UNE membership staff+.
      allowed =
        !!restaurantId && hasMembership(restaurantId, "staff");
      // Fallback : s'il n'y a pas encore de resto sélectionné, on regarde s'il
      // a au moins une membership tout court.
      if (!allowed) {
        const { principal } = useSession();
        allowed = !!principal?.memberships.some(
          (m) => m.status === "active" && m.role !== "kitchen",
        );
      }
      break;
  }

  if (!allowed) {
    return (
      <GuardCard
        title={title}
        description={description}
        ctaTo={ctaTo}
        ctaLabel={ctaLabel}
      />
    );
  }

  return <>{children}</>;
}

function GuardCard({
  title,
  description,
  ctaTo,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaTo: string;
  ctaLabel: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-7 w-7 text-primary" strokeWidth={2.25} />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Link
        to={ctaTo}
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow transition hover:bg-primary/90"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
