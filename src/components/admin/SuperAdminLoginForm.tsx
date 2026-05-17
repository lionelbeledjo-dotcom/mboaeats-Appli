import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2, Lock, Mail, Crown, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { get2faStatus, verifyLogin2fa } from "@/lib/superadmin-2fa.functions";

type Mode = "signin" | "bootstrap" | "twofa";

export function SuperAdminLoginForm() {
  const navigate = useNavigate();
  const get2fa = useServerFn(get2faStatus);
  const verify2fa = useServerFn(verifyLogin2fa);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      // On utilise une RPC SECURITY DEFINER au lieu d'une lecture directe
      // de user_roles. La table est protégée par des RLS qui exigent une
      // session authentifiée — or ce check tourne côté anonyme (avant
      // connexion). Sans la RPC, la lecture renvoyait 0 même quand un
      // superadmin existait, forçant à tort le mode "bootstrap".
      const { data, error } = await supabase.rpc("has_any_superadmin");
      if (error) {
        // En cas d'erreur réseau ou si la RPC n'est pas encore déployée,
        // on garde le mode signin par défaut — c'est l'option safe (un
        // signup anonyme ne peut pas se promouvoir superadmin sans le RPC
        // claim_superadmin qui re-vérifie côté serveur).
        // eslint-disable-next-line no-console
        console.warn("[SuperAdminLogin] has_any_superadmin failed:", error);
        return;
      }
      if (data === false) {
        setBootstrapAvailable(true);
        setMode("bootstrap");
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // garde-fou anti double-submit
    setError(null);
    setInfo(null);

    if (!email || !password) return setError("Email et mot de passe requis");
    if (mode === "bootstrap" && password !== confirm) return setError("Les mots de passe ne correspondent pas");
    if (password.length < 8) return setError("Mot de passe : 8 caractères minimum");

    setLoading(true);
    try {
      if (mode === "bootstrap") {
        // eslint-disable-next-line no-console
        console.log("[login] bootstrap: creating superadmin account...");
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/superadmin` },
        });
        if (signUpErr && !/registered/i.test(signUpErr.message)) throw signUpErr;

        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setInfo("Compte créé. Vérifiez votre email pour confirmer puis revenez ici.");
          setLoading(false);
          return;
        }

        const { data: claimed, error: claimErr } = await supabase.rpc("claim_superadmin");
        if (claimErr) throw claimErr;
        if (!claimed) throw new Error("Impossible de revendiquer le rôle superadmin");

        // eslint-disable-next-line no-console
        console.log("[login] bootstrap done, redirecting to /superadmin");
        navigate({ to: "/superadmin" });
        return;
      }

      // eslint-disable-next-line no-console
      console.log("[login] signing in...");
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // eslint-disable-next-line no-console
      console.log("[login] signed in, checking 2FA status...");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session introuvable");

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle();

      if (!role) {
        await supabase.auth.signOut();
        throw new Error("Accès refusé : ce compte n'est pas SUPER_ADMIN.");
      }

      // Étape 2 : 2FA
      const status = await get2fa();
      if (!status.enabled) {
        // eslint-disable-next-line no-console
        console.log("[login] redirecting to /superadmin/setup-2fa");
        navigate({ to: "/superadmin/setup-2fa" });
        return;
      }
      // eslint-disable-next-line no-console
      console.log("[login] 2FA enabled, prompting for code");
      setMode("twofa");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[login] error:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!twoFaCode) return setError("Code requis");
    setLoading(true);
    try {
      await verify2fa({ data: { code: twoFaCode, useBackup } });
      navigate({ to: "/superadmin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-[160px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10">
        <div className="mb-6 flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">MboaEats Super Admin</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">Accès propriétaire plateforme</p>
          </div>
        </div>

        {mode === "twofa" ? (
          <form onSubmit={handle2faSubmit} className="w-full rounded-3xl border border-border bg-card/80 p-6 shadow-card backdrop-blur-xl animate-fade-up">
            <div className="mb-5 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Vérification en 2 étapes</span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {useBackup ? "Entrez l'un de vos codes de secours." : "Ouvrez votre application d'authentification et entrez le code à 6 chiffres."}
            </p>
            <input
              inputMode={useBackup ? "text" : "numeric"}
              autoComplete="one-time-code"
              maxLength={useBackup ? 9 : 6}
              value={twoFaCode}
              onChange={(e) => setTwoFaCode(useBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
              placeholder={useBackup ? "XXXX-XXXX" : "123456"}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-primary"
              required
              autoFocus
            />
            {error && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Vérifier
            </button>
            <button type="button" onClick={() => { setUseBackup(!useBackup); setTwoFaCode(""); setError(null); }} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">
              {useBackup ? "← Utiliser un code TOTP" : "Utiliser un code de secours"}
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="w-full rounded-3xl border border-border bg-card/80 p-6 shadow-card backdrop-blur-xl animate-fade-up">
          <div className="mb-5 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">
              {mode === "bootstrap" ? "Première configuration" : "Authentification SUPER_ADMIN"}
            </span>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email maître</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" placeholder="superadmin@mboaeats.com" required />
          </div>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input type="password" autoComplete={mode === "bootstrap" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" placeholder="••••••••" required minLength={8} />
          </div>

          {mode === "bootstrap" && (
            <>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmer</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" placeholder="••••••••" required minLength={8} />
              </div>
            </>
          )}

          {error && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          {info && <p className="mt-4 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">{info}</p>}

          <button type="submit" disabled={loading} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-colors duration-200 hover:opacity-95 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {mode === "bootstrap" ? "Initialiser le SUPER_ADMIN" : "Se connecter"}
          </button>

          {bootstrapAvailable && (
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Aucun SUPER_ADMIN n'est encore configuré. Ce premier compte deviendra le propriétaire de la plateforme.
            </p>
          )}
        </form>
        )}
      </div>
    </div>
  );
}
