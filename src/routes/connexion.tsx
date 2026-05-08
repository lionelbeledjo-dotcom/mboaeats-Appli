import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, AlertCircle, ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { loginWithPassword } from "@/lib/auth.functions";
import { useAuth } from "@/hooks/useAuth";
import { invalidateSessionCache } from "@/hooks/useSessionUser";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connectez-vous à MboaEats avec votre email et mot de passe." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function Connexion() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const loginFn = useServerFn(loginWithPassword);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resentOk, setResentOk] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate({ to: "/", replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setResentOk(false);

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Adresse email invalide");
      return;
    }
    if (password.length < 6) {
      setError("Mot de passe requis");
      return;
    }

    setLoading(true);
    try {
      const res = await loginFn({ data: { email: trimmed, password } });
      if (!res.ok) {
        setError(res.message);
        setErrorCode(res.code);
        return;
      }
      // Connexion Supabase côté client pour synchroniser l'état (et permettre supabase queries)
      await supabase.auth.signInWithPassword({ email: trimmed, password });
      invalidateSessionCache();
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendBusy(true);
    setResentOk(false);
    try {
      await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/connexion` },
      });
      setResentOk(true);
    } catch {
      // ignore
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06C167]">
            <span className="text-3xl">🍲</span>
          </div>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-black">MboaEats</h2>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-white p-6 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-neutral-100">
          <h1 className="text-center text-2xl font-bold tracking-tight text-black">Connexion</h1>
          <p className="mt-1 text-center text-sm text-[#6B6B6B]">
            Entrez vos identifiants pour continuer
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
            <label className="flex h-12 items-center gap-3 rounded-xl bg-[#F6F6F6] px-4 focus-within:ring-2 focus-within:ring-black/10">
              <Mail className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-[#9b9b9b] outline-none"
              />
            </label>

            <label className="flex h-12 items-center gap-3 rounded-xl bg-[#F6F6F6] px-4 focus-within:ring-2 focus-within:ring-black/10">
              <Lock className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-[#9b9b9b] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-[#6B6B6B] hover:text-black"
                aria-label={showPwd ? "Masquer" : "Afficher"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </label>

            <div className="flex justify-end">
              <Link
                to="/reset-password"
                className="text-xs font-medium text-[#06C167] hover:underline underline-offset-4"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {error && (
              <div className="space-y-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
                {errorCode === "compte_inexistant" && (
                  <Link
                    to="/inscription"
                    className="block rounded-lg bg-white px-3 py-1.5 text-center text-xs font-bold text-[#06C167] ring-1 ring-red-100 hover:bg-red-50"
                  >
                    Créer un compte →
                  </Link>
                )}
                {errorCode === "email_non_confirme" && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendBusy}
                    className="block w-full rounded-lg bg-white px-3 py-1.5 text-center text-xs font-bold text-[#06C167] ring-1 ring-red-100 hover:bg-red-50 disabled:opacity-60"
                  >
                    {resendBusy ? "Envoi..." : resentOk ? "✓ Email renvoyé" : "Renvoyer l'email de confirmation"}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C167] text-sm font-bold text-white transition hover:bg-[#05a857] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Signup block */}
        <div className="mt-6 w-full text-center">
          <p className="text-sm text-black">
            Nouveau sur MboaEats ?{" "}
            <Link
              to="/inscription"
              className="font-bold text-[#06C167] hover:underline underline-offset-4"
            >
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#6B6B6B]">
          En continuant tu acceptes nos{" "}
          <Link to="/cgu" className="underline underline-offset-2 hover:text-black">CGU</Link>{" "}
          et notre{" "}
          <Link to="/confidentialite" className="underline underline-offset-2 hover:text-black">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
