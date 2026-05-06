import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Phone, ShieldCheck, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connectez-vous en 5 secondes avec votre numéro Cameroun ou France et un code OTP par SMS." },
    ],
  }),
});

type Step = "phone" | "otp" | "done";

const PREFIXES = [
  { code: "+237", label: "🇨🇲 +237", min: 8 },
  { code: "+33", label: "🇫🇷 +33", min: 9 },
];

function Connexion() {
  const [step, setStep] = useState<Step>("phone");
  const [prefix, setPrefix] = useState("+237");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const fullPhone = () => `${prefix}${phone.replace(/\D/g, "")}`;

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cur = PREFIXES.find((p) => p.code === prefix)!;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < cur.min) {
      setError(`Numéro trop court pour ${prefix}`);
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: fullPhone(),
      options: { channel: "sms" },
    });
    setLoading(false);
    if (err) {
      setError(err.message || "Impossible d'envoyer le SMS. Vérifiez la configuration du fournisseur.");
      return;
    }
    setStep("otp");
    setResendIn(30);
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  const handleOtpChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) verify(next.join(""));
  };

  const verify = async (code: string) => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: fullPhone(),
      token: code,
      type: "sms",
    });
    setLoading(false);
    if (err) {
      setError("Code invalide ou expiré.");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      return;
    }
    setStep("done");
    setTimeout(() => navigate({ to: "/" }), 1200);
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setResendIn(30);
    await supabase.auth.signInWithOtp({ phone: fullPhone(), options: { channel: "sms" } });
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
              <p className="text-sm text-muted-foreground">Connexion SMS · Cameroun & France</p>
            </div>
          </div>

          {step === "phone" && (
            <form onSubmit={sendCode} className="mt-8 space-y-5 animate-fade-up">
              <label className="block text-sm font-medium">Numéro de téléphone</label>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2">
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="rounded-xl bg-surface px-3 py-3 text-sm font-semibold outline-none"
                  aria-label="Indicatif"
                >
                  {PREFIXES.map((p) => (
                    <option key={p.code} value={p.code}>{p.label}</option>
                  ))}
                </select>
                <input
                  inputMode="tel"
                  placeholder={prefix === "+33" ? "6 12 34 56 78" : "6 90 00 00 00"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                MTN, Orange, Camtel, opérateurs FR · Données chiffrées
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
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Recevoir le code SMS"}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                En continuant, vous acceptez les CGU & la politique de confidentialité.
              </p>
            </form>
          )}

          {step === "otp" && (
            <div className="mt-8 space-y-5 animate-fade-up">
              <div>
                <p className="text-sm">Code envoyé au</p>
                <p className="font-semibold">{prefix} {phone}</p>
              </div>

              <div className="flex items-center justify-between gap-2">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
                    }}
                    className="h-14 w-full rounded-2xl border border-border bg-background/60 text-center text-xl font-bold outline-none transition focus:border-primary focus:shadow-glow"
                  />
                ))}
              </div>

              {loading && (
                <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                disabled={resendIn > 0}
                onClick={resend}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                {resendIn > 0 ? `Renvoyer le code dans ${resendIn}s` : "Renvoyer le code"}
              </button>

              <button
                onClick={() => { setStep("phone"); setOtp(["","","","","",""]); setError(null); }}
                className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Modifier le numéro
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="mt-10 flex flex-col items-center gap-4 text-center animate-scale-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
                <Check className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold">Akwaba 👋</h2>
              <p className="text-sm text-muted-foreground">Connexion réussie. On vous redirige…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
