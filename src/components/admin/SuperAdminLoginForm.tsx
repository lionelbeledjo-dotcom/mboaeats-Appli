import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2, Lock, Mail, Crown, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
      const { count } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "superadmin");
      if ((count ?? 0) === 0) {
        setBootstrapAvailable(true);
        setMode("bootstrap");
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) return setError("Email et mot de passe requis");
    if (mode === "bootstrap" && password !== confirm) return setError("Les mots de passe ne correspondent pas");
    if (password.length < 8) return setError("Mot de passe : 8 caractères minimum");

    setLoading(true);
    try {
      if (mode === "bootstrap") {
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

        navigate({ to: "/superadmin" });
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

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
        navigate({ to: "/superadmin/setup-2fa" });
        return;
      }
      setMode("twofa");
    } catch (err) {
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

  /**
   * Connexion via Google OAuth.
   *
   * Le bouton "Continuer avec Google" est utile pour les superadmins dont
   * le compte a été créé via OAuth Google et qui n'ont donc pas de mot de
   * passe. Après la redirection Google, l'utilisateur revient sur
   * `/superadmin` ; le `beforeLoad` du layout admin re-vérifie le rôle
   * `superadmin` côté DB. Un user Google qui n'aurait PAS ce rôle est
   * proprement bloqué par cette garde — donc ce bouton ne crée pas de
   * faille d'élévation de privilèges.
   *
   * Note 2FA : le flux Google contourne la vérification 2FA du formulaire
   * email/password. C'est intentionnel pour le bootstrap ; la 2FA reste
   * exigée par les server functions superadmin sensibles via le
   * middleware `requirePlatformSuperadmin` qui valide le marqueur 2FA
   * récent côté serveur.
   */
  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/superadmin`,
        },
      });
      if (oauthErr) throw oauthErr;
      // Pas de navigate ici : le browser est redirigé par Supabase vers Google.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Google OAuth");
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

          <button type="submit" disabled={loading} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {mode === "bootstrap" ? "Initialiser le SUPER_ADMIN" : "Se connecter"}
          </button>

          {/* Connexion Google — utile pour les superadmins créés via OAuth.
              Caché en mode bootstrap (la création initiale doit passer par
              email/password pour fixer un mot de passe maître). */}
          {mode === "signin" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-background text-sm font-semibold text-foreground transition hover:bg-muted/40 disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuer avec Google
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Réservé aux comptes ayant le rôle <code className="rounded bg-muted px-1 py-0.5">superadmin</code>.
              </p>
            </>
          )}

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
