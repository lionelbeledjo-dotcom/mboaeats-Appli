import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, ShieldCheck, LogOut, Save, KeyRound } from "lucide-react";

export const Route = createFileRoute("/compte/securite")({
  component: SecuritePage,
  head: () => ({
    meta: [
      { title: "Compte & sécurité · MboaEats" },
      { name: "description", content: "Gérez votre email, mot de passe et la double authentification (2FA)." },
    ],
  }),
});

function SecuritePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("vous@exemple.cm");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);
  const [savedPwd, setSavedPwd] = useState<string | null>(null);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedEmail(true);
    setTimeout(() => setSavedEmail(false), 2500);
  };

  const submitPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) {
      setSavedPwd("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setSavedPwd("Les mots de passe ne correspondent pas.");
      return;
    }
    setSavedPwd("ok");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setSavedPwd(null), 2500);
  };

  const logout = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut();
    } catch {}
    navigate({ to: "/connexion" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/aide" hash="categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display font-bold">Compte & sécurité</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8">
        {/* Email */}
        <form onSubmit={submitEmail} className="rounded-3xl border border-border bg-surface/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Adresse email</h2>
              <p className="text-xs text-muted-foreground">Utilisée pour vous connecter et recevoir les confirmations.</p>
            </div>
          </div>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            {savedEmail && <p className="text-xs text-emerald-400">✅ Email mis à jour</p>}
            <button className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </button>
          </div>
        </form>

        {/* Mot de passe */}
        <form onSubmit={submitPwd} className="rounded-3xl border border-border bg-surface/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Mot de passe</h2>
              <p className="text-xs text-muted-foreground">Au moins 8 caractères, mêlez lettres et chiffres.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <PwdInput label="Actuel" value={currentPwd} onChange={setCurrentPwd} />
            <PwdInput label="Nouveau" value={newPwd} onChange={setNewPwd} />
            <PwdInput label="Confirmer" value={confirmPwd} onChange={setConfirmPwd} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            {savedPwd === "ok" && <p className="text-xs text-emerald-400">✅ Mot de passe mis à jour</p>}
            {savedPwd && savedPwd !== "ok" && <p className="text-xs text-destructive">{savedPwd}</p>}
            <button className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow">
              <KeyRound className="h-3.5 w-3.5" /> Changer
            </button>
          </div>
        </form>

        {/* 2FA */}
        <section className="rounded-3xl border border-border bg-surface/60 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Double authentification (2FA)</h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={twoFA}
                  onClick={() => setTwoFA((v) => !v)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    twoFA ? "bg-gradient-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      twoFA ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajoute un code à 6 chiffres reçu par SMS/WhatsApp à chaque connexion. Recommandé.
              </p>
              {twoFA && (
                <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  ✅ 2FA activée — un code vous sera demandé à votre prochaine connexion.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Déconnexion */}
        <section className="rounded-3xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="font-display text-lg font-bold text-destructive">Déconnexion</h2>
          <p className="mt-1 text-xs text-muted-foreground">Vous serez redirigé vers l'écran de connexion.</p>
          <button
            type="button"
            onClick={logout}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground transition hover:opacity-90"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </section>
      </main>
    </div>
  );
}

function PwdInput({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
