import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

type Mode = "signin" | "bootstrap";

const ADMIN_HOSTS = new Set(["admin.mboaeat.site", "admin.mboaeats.com"]);

function adminRedirectTarget(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname.toLowerCase();
  // Force the OAuth callback back to the admin subdomain when we initiate
  // from it, so Supabase doesn't fall back to the main Site URL.
  if (ADMIN_HOSTS.has(host)) {
    return `${window.location.protocol}//${window.location.host}/admin`;
  }
  return `${window.location.origin}/admin`;
}

export function AdminLoginForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) === 0) {
        setBootstrapAvailable(true);
        setMode("bootstrap");
      }
    })();
  }, []);

  // Post-auth redirect: if a session exists (e.g. after Google OAuth callback)
  // and the user has the admin role, send them to the admin dashboard
  // instead of staying on /admin/login.
  useEffect(() => {
    let cancelled = false;
    async function checkAndRedirect() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "superadmin"])
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (role) {
        navigate({ to: "/admin", replace: true });
      }
    }
    checkAndRedirect();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        checkAndRedirect();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) return setError("Identifiant et code requis");
    if (mode === "bootstrap" && password !== confirm) return setError("Les codes ne correspondent pas");
    if (password.length < 8) return setError("Code : 8 caractères minimum");

    setLoading(true);
    try {
      if (mode === "bootstrap") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: adminRedirectTarget() },
        });
        if (signUpErr && !/registered/i.test(signUpErr.message)) throw signUpErr;

        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setInfo("Compte créé. Vérifiez votre email pour confirmer puis revenez ici.");
          setLoading(false);
          return;
        }

        const { data: claimed, error: claimErr } = await supabase.rpc("claim_super_admin");
        if (claimErr) throw claimErr;
        if (!claimed) throw new Error("Impossible de revendiquer le rôle admin");

        navigate({ to: "/admin" });
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session introuvable");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roles) {
        await supabase.auth.signOut();
        throw new Error("Accès refusé : ce compte n'est pas administrateur.");
      }

      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0f] text-white">
      {/* Radiant amber decorations top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] overflow-hidden">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 400 340"
          fill="none"
          preserveAspectRatio="xMidYMin slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="amberStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <radialGradient id="amberGlow" cx="50%" cy="0%" r="60%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="340" fill="url(#amberGlow)" />
          {/* Curves */}
          <path d="M -40 80 Q 120 10 280 90 T 460 60" stroke="url(#amberStroke)" strokeWidth="1.5" opacity="0.7" fill="none" />
          <path d="M -40 130 Q 140 60 300 140 T 480 110" stroke="url(#amberStroke)" strokeWidth="1" opacity="0.5" fill="none" />
          <path d="M -40 30 Q 100 -20 240 40 T 460 10" stroke="url(#amberStroke)" strokeWidth="1" opacity="0.4" fill="none" />
          {/* Geometric arcs */}
          <circle cx="340" cy="60" r="70" stroke="url(#amberStroke)" strokeWidth="1.2" opacity="0.6" fill="none" />
          <circle cx="340" cy="60" r="100" stroke="url(#amberStroke)" strokeWidth="0.8" opacity="0.35" fill="none" />
          <circle cx="60" cy="40" r="40" stroke="#fbbf24" strokeWidth="0.8" opacity="0.4" fill="none" />
          {/* Lines */}
          <line x1="20" y1="180" x2="120" y2="180" stroke="#fbbf24" strokeWidth="1" opacity="0.3" />
          <line x1="280" y1="200" x2="380" y2="200" stroke="#f97316" strokeWidth="1" opacity="0.4" />
        </svg>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        {/* Header */}
        <div className="mb-10 flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_40px_rgba(251,146,60,0.5)]">
            <Flame className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Mboa Console</h1>
            <p className="mt-2 text-sm font-light text-white/60">
              Veuillez vous connecter pour continuer
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 animate-fade-up">
          {/* Phone / identifiant */}
          <div>
            <label className="mb-2 block text-xs font-medium text-white/70">Numéro</label>
            <div className="flex items-stretch gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/60 bg-[#1a1a1d] px-3 text-sm font-semibold text-white">
                <span className="text-base leading-none">🇨🇲</span>
                <span>+237</span>
              </div>
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-amber-500/60 bg-[#1a1a1d] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                placeholder="Entrez votre numéro"
                required
              />
            </div>
          </div>

          {/* Code */}
          <div>
            <label className="mb-2 block text-xs font-medium text-white/70">Code</label>
            <input
              type="password"
              autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-amber-500/60 bg-[#1a1a1d] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              placeholder="Entrez votre code"
              required
              minLength={8}
            />
          </div>

          {mode === "bootstrap" && (
            <div>
              <label className="mb-2 block text-xs font-medium text-white/70">Confirmer le code</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-amber-500/60 bg-[#1a1a1d] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                placeholder="Confirmez votre code"
                required
                minLength={8}
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="relative mt-6 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-sm font-bold uppercase tracking-wider text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,0.7)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "bootstrap" ? "Initialiser le compte" : "Se connecter"}
          </button>

          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <button type="button" className="text-sm text-white/70 hover:text-amber-300 transition">
              Vérifier le code ?
            </button>
            <button type="button" className="text-sm text-white/70 hover:text-amber-300 transition">
              Veuillez contacter l'administrateur ?
            </button>
          </div>

          {bootstrapAvailable && (
            <p className="mt-4 text-center text-[11px] text-white/50">
              Aucun administrateur n'est encore configuré. Ce premier compte deviendra le SUPER_ADMIN.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
