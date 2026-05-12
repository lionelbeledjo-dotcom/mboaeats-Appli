import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
}

/**
 * État vide réutilisable, illustration verte + texte encourageant.
 * Exemples : « Aucune commande », « Panier vide », « Aucun restaurant disponible ».
 */
export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCta,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/10" />
        <span className="absolute inset-3 rounded-full bg-primary/20" />
        <Icon className="relative h-12 w-12 text-primary" strokeWidth={1.75} />
      </div>
      <div className="max-w-xs space-y-1.5">
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {ctaLabel && (ctaHref ? (
        <Link
          to={ctaHref}
          className="mt-2 inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow hover:bg-accent transition-colors"
        >
          {ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onCta}
          className="mt-2 inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow hover:bg-accent transition-colors"
        >
          {ctaLabel}
        </button>
      ))}
    </div>
  );
}

export default EmptyState;
