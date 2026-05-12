import { Link } from "@tanstack/react-router";
import { Mail, Phone, Lock } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function GuestCheckoutGate({
  redirectTo = "/checkout",
}: {
  redirectTo?: string;
}) {
  const back = encodeURIComponent(redirectTo);
  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <div className="rounded-3xl bg-white p-6 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-neutral-100">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#06C167]/10">
          <Lock className="h-6 w-6 text-[#06C167]" strokeWidth={2.25} />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-black">
          Connectez-vous pour commander
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Votre panier est conservé. Choisissez votre méthode préférée.
        </p>

        <div className="mt-6 space-y-3">
          <GoogleSignInButton redirectTo={typeof window !== "undefined" ? `${window.location.origin}${redirectTo}` : undefined} />

          <Link
            to="/connexion"
            search={{ redirect: redirectTo } as never}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C167] text-sm font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_-8px_rgba(6,193,103,0.55)] hover:bg-[#05a857]"
          >
            <Mail className="h-4 w-4" /> Email ou téléphone
          </Link>

          <Link
            to="/connexion"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black ring-1 ring-neutral-200 hover:bg-neutral-50"
          >
            <Phone className="h-4 w-4" /> SMS (Cameroun)
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-neutral-500">
          Vous n'avez pas de compte ?{" "}
          <Link to="/inscription" className="font-bold text-[#06C167] hover:underline">
            Créer un compte
          </Link>
        </p>

        <div className="mt-4 hidden">{back}</div>
      </div>
    </div>
  );
}
