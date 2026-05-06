import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ShieldCheck, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connectez-vous gratuitement avec votre e-mail. Lien magique envoyé instantanément." },
    ],
  }),
});

function Connexion() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Adresse e-mail invalide");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (err) {
      setError(err.message || "Impossible d'envoyer l'e-mail. Réessayez.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-hero noise px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="mt-6 rounded-3xl border border-border bg-surface/80 p-6 shadow-card backdrop-blur md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Bienvenue au Mboa</h1>
              <p className="text-sm text-muted-foreground">Connexion par lien magique e-mail</p>
            </div>
          </div>

          {!sent ? (
            <form onSubmit={sendLink} className="mt-8 space-y-5 animate-fade-up">
              <label className="block text-sm font-medium">Adresse e-mail</label>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-3 text-base outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                100% gratuit · Aucun mot de passe · Lien valable 1h
              </p>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Recevoir mon lien magique"}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                En continuant, vous acceptez les CGU & la politique de confidentialité.
              </p>
            </form>
          ) : (
            <div className="mt-10 flex flex-col items-center gap-4 text-center animate-scale-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                <Check className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold">Vérifiez votre boîte mail 📬</h2>
              <p className="text-sm text-muted-foreground">
                Un lien de connexion a été envoyé à<br />
                <span className="font-semibold text-foreground">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Pensez à vérifier vos spams. Cliquez sur le lien pour ouvrir MboaEats.
              </p>
              <button
                onClick={() => { setSent(false); setError(null); }}
                className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Modifier l'adresse
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
