/**
 * MboaEats — Bouton de déconnexion sécurisé.
 *
 * Effectue :
 *   1. Clear du cookie serveur (états transitoires)
 *   2. supabase.auth.signOut({ scope: 'global' }) → révoque tous les refresh
 *      tokens du user sur tous ses appareils, vide localStorage
 *   3. Invalide le cache React Query
 *   4. Redirige vers `/`
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Loader2 } from "lucide-react";
import { useSignOut } from "@/auth/hooks/useSession";

interface Props {
  className?: string;
  redirectTo?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, redirectTo = "/", children }: Props) {
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      navigate({ to: redirectTo, replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        "inline-flex h-10 items-center gap-2 rounded-full border border-input bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
      }
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {children ?? "Se déconnecter"}
    </button>
  );
}
