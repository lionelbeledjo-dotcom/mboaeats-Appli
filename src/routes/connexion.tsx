import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, ShieldCheck, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connexion test par code OTP simulé." },
    ],
  }),
});

const DEMO_CODE = "123456";

function Connexion() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [country, setCountry] = useState<"+237" | "+33">("+237");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (phone.replace(/\D/g, "").length < 6) {
      setError("Numéro de téléphone invalide");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    setStep("otp");
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim() !== DEMO_CODE) {
      setError("Code invalide. Utilisez 123456 pour les tests.");
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem(
        "mboa_demo_user",
        JSON.stringify({ phone: `${country}${phone}`, loggedAt: Date.now() })
      );
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
    navigate({ to: "/" });
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
              <Phone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Bienvenue au Mboa</h1>
              <p className="text-sm text-muted-foreground">
                {step === "phone" ? "Connexion par numéro (mode test)" : "Saisissez le code reçu"}
              </p>
            </div>
          </div>

          {step === "phone" ? (
            <form onSubmit={submitPhone} className="mt-8 space-y-5 animate-fade-up">
              <label className="block text-sm font-medium">Numéro de téléphone</label>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as "+237" | "+33")}
                  className="rounded-xl bg-background/60 px-2 py-3 text-sm outline-none"
                >
                  <option value="+237">🇨🇲 +237</option>
                  <option value="+33">🇫🇷 +33</option>
                </select>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="6 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-3 text-base outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Mode démo · aucun SMS envoyé · code de test <span className="font-semibold text-foreground">123456</span>
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
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Recevoir le code"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="mt-8 space-y-5 animate-fade-up">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
                ✅ Mode test activé — saisissez <span className="font-bold">123456</span> pour entrer.
              </div>

              <label className="block text-sm font-medium">Code à 6 chiffres</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-2xl border border-border bg-background/60 px-4 py-4 text-center text-2xl font-bold tracking-[0.6em] outline-none placeholder:text-muted-foreground"
                autoFocus
              />

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
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><Check className="h-5 w-5" /> Valider et entrer</>)}
              </button>

              <button
                type="button"
                onClick={() => { setStep("phone"); setCode(""); setError(null); }}
                className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Modifier le numéro
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
