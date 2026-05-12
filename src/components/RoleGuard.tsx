import { Link } from "@tanstack/react-router";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles, type AppRole } from "@/hooks/useUserRoles";

type Props = {
  role: AppRole;
  children: React.ReactNode;
  ctaTo: string;
  ctaLabel: string;
  title: string;
  description: string;
};

export function RoleGuard({
  role,
  children,
  ctaTo,
  ctaLabel,
  title,
  description,
}: Props) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { has, loading } = useUserRoles();

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#06C167]" />
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

  if (!has(role)) {
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
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#06C167]/10">
        <Lock className="h-7 w-7 text-[#06C167]" strokeWidth={2.25} />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-black">
        {title}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
      <Link
        to={ctaTo}
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#06C167] px-6 text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_-8px_rgba(6,193,103,0.55)] transition hover:bg-[#05a857]"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
