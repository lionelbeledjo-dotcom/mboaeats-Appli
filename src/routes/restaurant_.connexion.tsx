import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChefHat,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Store,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

/**
 * Espace Partenaire — Page de connexion dédiée aux restaurateurs.
 *
 * UX différenciée de `/connexion` (page client) :
 *   - Branding clair "Espace Partenaire MboaEats"
 *   - Copy adaptée au métier ("Gérez votre restaurant")
 *   - Statistiques rassurantes (+40% commandes, etc.)
 *   - Lien direct vers /devenir-resto pour les nouveaux partenaires
 *
 * Logique métier :
 *   - Login OK → redirect vers /restaurant (qui décidera selon validation_status)
 *   - Pas encore partenaire → bouton vers /devenir-resto
 *
 * Sécurité : la même auth Supabase que la page client. Le contrôle d'accès
 * à l'espace restaurant se fait via le RoleGuard sur /restaurant, pas ici.
 * Cette page est juste une "porte d'entrée" UX différente.
 */
export const Route = createFileRoute("/restaurant/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion Partenaire — MboaEats" },
      {
        name: "description",
        content:
          "Connectez-vous à votre espace restaurateur MboaEats : gérez votre menu, vos commandes et vos statistiques.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RestaurantConnexionPage,
});

const emailSchema = z.string().trim().toLowerCase().email("Email invalide");
const passwordSchema = z
  .string()
  .min(6, "Mot de passe trop court (6 caractères minimum)");

function RestaurantConnexionPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Si l'utilisateur est DÉJÀ connecté quand il arrive sur cette page, on
  // l'envoie direct vers /restaurant (qui décidera s'il a un resto ou pas).
  // Évite la friction "je suis connecté mais on me redemande de me connecter".
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive && data.user) {
        navigate({ to: "/restaurant", replace: true });
      }
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const em = emailSchema.safeParse(email);
    if (!em.success) return setErr(em.error.issues[0].message);
    const p = passwordSchema.safeParse(pwd);
    if (!p.success) return setErr(p.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: em.data,
      password: p.data,
    });
    setBusy(false);

    if (error) {
      // Message générique : ne révèle pas si c'est l'email ou le mdp qui
      // est faux (anti-énumération de comptes).
      setErr("Email ou mot de passe incorrect.");
      return;
    }

    toast.success("Connexion réussie. Bienvenue !");
    navigate({ to: "/restaurant", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        {/* COLONNE GAUCHE — Branding et arguments partenaires */}
        <div className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Espace Partenaire
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-neutral-900 sm:text-5xl">
            Gérez votre <span className="text-emerald-600">restaurant</span>
            <br />
            en toute simplicité.
          </h1>
          <p className="mt-4 max-w-md text-base text-neutral-600">
            Recevez vos commandes en temps réel, mettez à jour votre menu en un
            clic, et suivez vos revenus depuis n'importe quel appareil.
          </p>

          <div className="mt-8 space-y-4">
            <PartnerBenefit
              icon={TrendingUp}
              title="+40% de commandes en moyenne"
              desc="Nos partenaires constatent une hausse significative dès le premier mois."
            />
            <PartnerBenefit
              icon={Store}
              title="Tableau de bord complet"
              desc="Menu, commandes, revenus bruts/nets, statistiques — tout au même endroit."
            />
            <PartnerBenefit
              icon={ShieldCheck}
              title="Paiement sécurisé"
              desc="MTN Money, Orange Money, carte bancaire — vos revenus protégés."
            />
          </div>
        </div>

        {/* COLONNE DROITE — Formulaire de connexion */}
        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl sm:p-8">
            {/* En-tête (mobile seulement) */}
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg">
                <ChefHat className="h-7 w-7 text-white" strokeWidth={2.4} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                Espace Partenaire
              </p>
            </div>

            {/* Titre formulaire */}
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
              Connexion
            </h2>
            <p className="mt-1.5 text-sm text-neutral-600">
              Accédez à votre tableau de bord restaurateur.
            </p>

            {/* Bouton Google */}
            <div className="mt-6">
              <GoogleSignInButton
                redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/restaurant`}
              />
            </div>

            {/* Séparateur */}
            <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              ou par email
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            {/* Formulaire email + password */}
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="resto-email"
                  className="mb-1.5 block text-xs font-semibold text-neutral-700"
                >
                  Email professionnel
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <input
                    id="resto-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@monrestaurant.com"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="resto-pwd"
                  className="mb-1.5 block text-xs font-semibold text-neutral-700"
                >
                  Mot de passe
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <Lock className="h-4 w-4 text-neutral-400" />
                  <input
                    id="resto-pwd"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {err && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Se connecter <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/connexion"
                  search={{ redirect: "/restaurant" }}
                  className="text-xs text-neutral-500 hover:text-neutral-800 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </form>

            {/* Footer — devenir partenaire */}
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-xs text-neutral-700">
                Vous n'êtes pas encore partenaire ?
              </p>
              <Link
                to="/devenir-resto"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:underline"
              >
                Devenir partenaire MboaEats
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Lien retour vers le site */}
          <div className="mt-5 text-center">
            <Link
              to="/"
              className="text-xs text-neutral-500 hover:text-neutral-800 hover:underline"
            >
              ← Retour au site MboaEats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerBenefit({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof TrendingUp;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div>
        <p className="font-display text-sm font-bold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-600">{desc}</p>
      </div>
    </div>
  );
}
