import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Bike, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, ArrowRight,
  Wallet, Clock, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

/**
 * Espace Livreur — page de connexion dédiée.
 * Branding orange pour se distinguer du resto (vert).
 */
export const Route = createFileRoute("/livreur_/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion Livreur — MboaEats" },
      { name: "description", content: "Connectez-vous à votre espace livreur MboaEats." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LivreurConnexionPage,
});

const emailSchema = z.string().trim().toLowerCase().email("Email invalide");
const passwordSchema = z.string().min(6, "Mot de passe trop court");

function LivreurConnexionPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive && data.user) navigate({ to: "/livreur", replace: true });
    });
    return () => { alive = false; };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const em = emailSchema.safeParse(email);
    if (!em.success) return setErr(em.error.issues[0].message);
    const p = passwordSchema.safeParse(pwd);
    if (!p.success) return setErr(p.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: em.data, password: p.data });
    setBusy(false);
    if (error) return setErr("Email ou mot de passe incorrect.");
    toast.success("Connexion réussie 🛵");
    navigate({ to: "/livreur", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 px-4 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-700">
            <ShieldCheck className="h-4 w-4" /> Espace Livreur
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-neutral-900 sm:text-5xl">
            Roulez avec <span className="text-orange-600">MboaEats</span>.
          </h1>
          <p className="mt-4 max-w-md text-base text-neutral-600">
            Acceptez des courses près de vous, livrez et soyez payé. Vous gérez votre temps.
          </p>
          <div className="mt-8 space-y-4">
            <Benefit icon={Wallet} title="Revenus rapides" desc="Suivi des livraisons en temps réel." />
            <Benefit icon={Clock} title="Horaires flexibles" desc="Vous décidez quand vous êtes en ligne." />
            <Benefit icon={ShieldCheck} title="Plateforme sécurisée" desc="Validation des profils et support 7j/7." />
          </div>
        </div>

        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg">
                <Bike className="h-7 w-7 text-white" strokeWidth={2.4} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-orange-700">Espace Livreur</p>
            </div>

            <h2 className="font-display text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">Connexion</h2>
            <p className="mt-1.5 text-sm text-neutral-600">Accédez à vos courses et livraisons.</p>

            <div className="mt-6">
              <GoogleSignInButton redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/livreur`} />
            </div>

            <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" /> ou par email <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="liv-email" className="mb-1.5 block text-xs font-semibold text-neutral-700">Email</label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  <input id="liv-email" type="email" autoComplete="email" inputMode="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@email.com"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400" />
                </div>
              </div>

              <div>
                <label htmlFor="liv-pwd" className="mb-1.5 block text-xs font-semibold text-neutral-700">Mot de passe</label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
                  <Lock className="h-4 w-4 text-neutral-400" />
                  <input id="liv-pwd" type={showPwd ? "text" : "password"} autoComplete="current-password"
                    value={pwd} onChange={(e) => setPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "Masquer" : "Afficher"}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {err && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{err}</span>
                </div>
              )}

              <button type="submit" disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-colors hover:from-orange-700 hover:to-orange-800 disabled:opacity-60">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : (<>Se connecter <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-center">
              <p className="text-xs text-neutral-700">Vous n'êtes pas encore livreur ?</p>
              <Link to="/devenir-livreur" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-orange-700 hover:underline">
                Devenir livreur MboaEats <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-5 text-center">
            <Link to="/" className="text-xs text-neutral-500 hover:text-neutral-800 hover:underline">← Retour au site MboaEats</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Benefit({ icon: Icon, title, desc }: { icon: typeof Wallet; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div>
        <p className="font-display text-sm font-bold text-neutral-900">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-600">{desc}</p>
      </div>
    </div>
  );
}
