import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Flame, ShieldCheck, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "bootstrap";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password) {
      setError("Email et mot de passe requis");
      return;
    }
    if (mode === "bootstrap" && password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Mot de passe : 8 caractères minimum");
      return;
    }

    setLoading(true);
    try {
      if (mode === "bootstrap") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gold/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10">
        <div className="mb-6 flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Flame className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">MboaEats Administration</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Console privée propriétaire
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-3xl border border-border bg-card/80 p-6 shadow-card backdrop-blur-xl animate-fade-up"
        >
          <div className="mb-5 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">
              {mode === "bootstrap" ? "Première configuration" : "Authentification SUPER_ADMIN"}
            </span>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email maître
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="admin@mboaeats.com"
              required
            />
          </div>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mot de passe
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {mode === "bootstrap" && (
            <>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirmer
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p className="mt-4 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {mode === "bootstrap" ? "Initialiser le compte propriétaire" : "Se connecter"}
          </button>

          {bootstrapAvailable && (
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Aucun administrateur n'est encore configuré. Ce premier compte deviendra le SUPER_ADMIN.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
