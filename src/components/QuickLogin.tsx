import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Phone, Loader2, AlertCircle, ShieldCheck, Check, ChevronDown } from "lucide-react";
import { sendOtp, verifyOtp } from "@/lib/otp.functions";

const COUNTRIES = [
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "CM", dial: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgique" },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Suisse" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "Royaume-Uni" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Allemagne" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Espagne" },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "Italie" },
  { code: "SN", dial: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "CI", dial: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "Maroc" },
];

export default function QuickLogin({ onSuccess }: { onSuccess?: () => void } = {}) {
  const navigate = useNavigate();
  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);

  const [countryCode, setCountryCode] = useState("CM");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCountries, setShowCountries] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const fullPhone = `${country.dial}${phone.replace(/\D/g, "")}`;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDevCode(null);
    if (phone.replace(/\D/g, "").length < 6) {
      setError("Numéro invalide");
      return;
    }
    setLoading(true);
    try {
      const res: any = await sendOtpFn({ data: { phone: fullPhone, channel: "sms" } });
      if (res?.ok === false) {
        setError(res.error ?? "Échec de l'envoi du SMS");
        if (typeof res.retryAfter === "number") setResendIn(res.retryAfter);
        return;
      }
      setStep("otp");
      setResendIn(30);
      // En dev, le serveur renvoie le code en clair pour faciliter le test.
      if (res?.devCode) setDevCode(String(res.devCode));
    } catch (err: any) {
      setError(err?.message ?? "Échec de l'envoi du SMS");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Saisissez les 6 chiffres reçus.");
      return;
    }
    setLoading(true);
    try {
      const res: any = await verifyOtpFn({ data: { phone: fullPhone, code: code.trim() } });
      if (res?.auth?.token_hash) {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error: vErr } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: res.auth.token_hash,
        });
        if (vErr) throw new Error(vErr.message);
      }
      try {
        const { invalidateSessionCache } = await import("@/hooks/useSessionUser");
        invalidateSessionCache();
      } catch {
        /* hook may not exist in some builds */
      }
      if (onSuccess) {
        onSuccess();
      } else {
        navigate({ to: "/profil" });
      }
    } catch (err: any) {
      setError(err?.message ?? "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  // Décompte du bouton "Renvoyer"
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    await handleSend(new Event("submit") as unknown as React.FormEvent);
  };

  return (
    <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-card backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Phone className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold">Connexion rapide</h3>
          <p className="text-[11px] text-muted-foreground">Recevez un code par SMS pour vous connecter</p>
        </div>
      </div>

      {step === "phone" ? (
        <form onSubmit={handleSend} className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 focus-within:border-primary">
            <button
              type="button"
              onClick={() => setShowCountries((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2.5 text-sm font-medium hover:bg-muted/60"
            >
              <span className="text-base leading-none">{country.flag}</span>
              <span>{country.dial}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={countryCode === "FR" ? "6 12 34 56 78" : "Numéro"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted-foreground"
            />
          </div>

          {showCountries && (
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-border bg-background p-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setCountryCode(c.code); setShowCountries(false); }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/60 ${c.code === countryCode ? "bg-muted/40" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span>{c.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{c.dial}</span>
                </button>
              ))}
            </div>
          )}

          <p className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Un code à 6 chiffres vous sera envoyé par SMS via Twilio.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recevoir le code par SMS"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs">
            📩 Code envoyé au <span className="font-semibold">{fullPhone}</span>
          </div>
          {devCode && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700">
              🛠️ Mode dev — code : <span className="font-mono font-bold">{devCode}</span>
            </div>
          )}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-center text-xl font-bold tracking-[0.5em] outline-none focus:border-primary"
            autoFocus
          />
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Check className="h-4 w-4" /> Valider et entrer</>)}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendIn > 0 || loading}
            className="block w-full text-center text-xs font-medium text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            {resendIn > 0 ? `Renvoyer le code dans ${resendIn}s` : "Renvoyer le code"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(null); setDevCode(null); }}
            className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Modifier le numéro
          </button>
        </form>
      )}
    </div>
  );
}
