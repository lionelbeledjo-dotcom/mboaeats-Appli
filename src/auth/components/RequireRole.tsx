/**
 * MboaEats — Composants de garde côté UI.
 *
 * RÈGLE D'OR : les gardes UI sont une COMMODITÉ pour l'UX (cacher des liens,
 * afficher un placeholder). La vraie sécurité est dans les middlewares
 * serveur (`requirePlatformAdmin`, `assertMembership`, RLS). NE JAMAIS se
 * reposer uniquement sur ces composants pour protéger des données.
 */

import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { useSession } from "@/auth/hooks/useSession";
import type { RestaurantRole } from "@/auth/types";

// -----------------------------------------------------------------------------
// Carte d'accès refusé — réutilisée par tous les composants Require*
// -----------------------------------------------------------------------------
interface GuardCardProps {
  title: string;
  description: string;
  ctaTo: string;
  ctaLabel: string;
}

function GuardCard({ title, description, ctaTo, ctaLabel }: GuardCardProps) {
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

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// RequireAuth — exige juste un login
// -----------------------------------------------------------------------------
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useSession();
  if (isLoading) return <LoadingScreen />;
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
  return <>{children}</>;
}

// -----------------------------------------------------------------------------
// RequirePlatformAdmin
// -----------------------------------------------------------------------------
export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isPlatformAdmin } = useSession();
  if (isLoading) return <LoadingScreen />;
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
  if (!isPlatformAdmin) {
    return (
      <GuardCard
        title="Accès administrateur requis"
        description="Cette section est réservée à l'équipe MboaEats."
        ctaTo="/"
        ctaLabel="Retour à l'accueil"
      />
    );
  }
  return <>{children}</>;
}

// -----------------------------------------------------------------------------
// RequirePlatformSuperadmin — superadmin + 2FA récente
// -----------------------------------------------------------------------------
export function RequirePlatformSuperadmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isPlatformSuperadmin, principal } =
    useSession();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return (
      <GuardCard
        title="Connexion requise"
        description="Connectez-vous pour accéder à cet espace."
        ctaTo="/superadmin/login"
        ctaLabel="Se connecter"
      />
    );
  }
  if (!isPlatformSuperadmin) {
    return (
      <GuardCard
        title="Accès super-administrateur requis"
        description="Cette section est réservée au super-administrateur de la plateforme."
        ctaTo="/"
        ctaLabel="Retour à l'accueil"
      />
    );
  }
  if (!principal?.superadmin2faValid) {
    return (
      <GuardCard
        title="Authentification 2FA requise"
        description="Validez votre code 2FA pour accéder à cette section."
        ctaTo="/superadmin/login"
        ctaLabel="Valider la 2FA"
      />
    );
  }
  return <>{children}</>;
}

// -----------------------------------------------------------------------------
// RequireMembership — exige une membership sur un resto donné, avec rôle min
// -----------------------------------------------------------------------------
export function RequireMembership({
  restaurantId,
  minRole = "kitchen",
  children,
}: {
  restaurantId: string | null | undefined;
  minRole?: RestaurantRole;
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated, hasMembership } = useSession();
  if (isLoading) return <LoadingScreen />;
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
  if (!restaurantId) {
    return (
      <GuardCard
        title="Aucun restaurant sélectionné"
        description="Sélectionnez un restaurant pour continuer."
        ctaTo="/restaurant"
        ctaLabel="Mes restaurants"
      />
    );
  }
  if (!hasMembership(restaurantId, minRole)) {
    return (
      <GuardCard
        title="Accès restaurant refusé"
        description={`Cette section requiert le rôle ${minRole} ou supérieur dans ce restaurant.`}
        ctaTo="/"
        ctaLabel="Retour à l'accueil"
      />
    );
  }
  return <>{children}</>;
}

// -----------------------------------------------------------------------------
// RequireDriver
// -----------------------------------------------------------------------------
export function RequireDriver({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isDriver } = useSession();
  if (isLoading) return <LoadingScreen />;
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
  if (!isDriver) {
    return (
      <GuardCard
        title="Accès livreur requis"
        description="Cette section est réservée aux livreurs MboaEats. Postulez si vous êtes intéressé(e)."
        ctaTo="/devenir-livreur"
        ctaLabel="Devenir livreur"
      />
    );
  }
  return <>{children}</>;
}
