import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import QuickLogin from "@/components/QuickLogin";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MboaEats — Connexion" },
      { name: "description", content: "Connectez-vous à MboaEats pour commander vos plats camerounais préférés." },
      { property: "og:title", content: "MboaEats — Connexion" },
      { property: "og:description", content: "Accédez à votre compte MboaEats." },
    ],
  }),
  component: Landing,
});

const emailSchema = z.string().trim().email("Email invalide").max(255);

function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<"phone" | "email">("phone");

  // If already authenticated, skip the gate and go to the restaurants home
  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: "/accueil", replace: true });
  }, [loading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06C167] text-2xl font-black text-white shadow-lg">
            M
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-black">Bienvenue sur MboaEats</h1>
          <p className="mt-1 text-sm text-neutral-600">Connecte-toi pour commander en quelques secondes.</p>
        </div>

        {/* Tabs */}
        <div className="mb-5 inline-flex w-full rounded-full bg-neutral-100 p-1">
          {(["phone", "email"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === t ? "bg-white text-black shadow-sm" : "text-neutral-600 hover:text-black"
              }`}
            >
              {t === "phone" ? "Téléphone" : "Email"}
            </button>
          ))}
        </div>

        {tab === "phone" ? (
          <QuickLogin onSuccess={() => navigate({ to: "/accueil" })} />
        ) : (
          <EmailLoginForm onSuccess={() => navigate({ to: "/accueil" })} />
        )}

        {/* Signup invite */}
        <p className="mt-6 text-center text-sm text-neutral-600">
          Nouveau sur MboaEats ?{" "}
          <Link to="/inscription" className="font-bold text-[#06C167] hover:underline underline-offset-4">
            S'inscrire
          </Link>
        </p>

        {/* Footer */}
        <p className="mt-auto pt-8 text-center text-xs text-neutral-500">
          En continuant tu acceptes nos{" "}
          <Link to="/cgu" className="font-medium text-neutral-700 underline underline-offset-2 hover:text-black">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link to="/confidentialite" className="font-medium text-neutral-700 underline underline-offset-2 hover:text-black">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function EmailLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const eRes = emailSchema.safeParse(email);
    if (!eRes.success) return setErr(eRes.error.issues[0].message);
    if (!pwd) return setErr("Mot de passe requis");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: eRes.data, password: pwd });
    setBusy(false);
    if (error) {
      setErr(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : error.message,
      );
      return;
    }
    toast.success("Connexion réussie");
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-all focus-within:border-[#06C167] focus-within:ring-2 focus-within:ring-[#06C167]/20">
        <Mail className="h-4 w-4 shrink-0 text-neutral-500" />
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
        />
      </label>

      <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-all focus-within:border-[#06C167] focus-within:ring-2 focus-within:ring-[#06C167]/20">
        <Lock className="h-4 w-4 shrink-0 text-neutral-500" />
        <input
          type={showPwd ? "text" : "password"}
          autoComplete="current-password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Mot de passe"
          className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
        />
        <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-neutral-500" aria-label="Afficher">
          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </label>

      <div className="flex justify-end pt-1">
        <Link to="/reset-password" className="text-xs font-medium text-neutral-600 hover:text-black">
          Mot de passe oublié ?
        </Link>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C167] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_8px_24px_-12px_rgba(6,193,103,0.7)] transition-all hover:bg-[#05A659] active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Se connecter
        {!busy && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
      </button>
    </form>
  );
}
