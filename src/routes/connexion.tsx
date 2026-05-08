import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Phone, Loader2, AlertCircle, Check, ArrowRight, ChevronDown } from "lucide-react";
import { sendOtp, verifyOtp } from "@/lib/otp.functions";
import { useAuth } from "@/hooks/useAuth";
import { invalidateSessionCache } from "@/hooks/useSessionUser";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connectez-vous à MboaEats avec votre numéro de téléphone." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const COUNTRIES = [
  { code: "CM", dial: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgique" },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Suisse" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "Royaume-Uni" },
  { code: "SN", dial: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "CI", dial: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "Maroc" },
];

function Connexion() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
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

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate({ to: "/", replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

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
      invalidateSessionCache();
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950">
      {/* Decorative background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 shadow-2xl">
            <span className="text-3xl">🍲</span>
          </div>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-white">MboaEats</h2>
        </div>

        {/* Glass card */}
        <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <h1 className="text-center text-2xl font-bold tracking-tight text-white">
            {step === "phone" ? "Connexion" : "Vérification"}
          </h1>
          <p className="mt-1 text-center text-sm text-white/70">
            {step === "phone"
              ? "Entrez votre numéro pour recevoir un code"
              : `Code envoyé au ${fullPhone}`}
          </p>

          {step === "phone" ? (
            <form onSubmit={handleSend} className="mt-6 space-y-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-1.5 transition focus-within:border-white/50 focus-within:bg-white/15">
                <button
                  type="button"
                  onClick={() => setShowCountries((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/25"
                >
                  <span className="text-base leading-none">{country.flag}</span>
                  <span>{country.dial}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="6XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent px-2 py-2.5 text-base text-white placeholder:text-white/50 outline-none"
                />
              </div>

              {showCountries && (
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/20 bg-neutral-900/80 p-2 backdrop-blur-xl">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountryCode(c.code);
                        setShowCountries(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10 ${
                        c.code === countryCode ? "bg-white/10" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="text-xs text-white/60">{c.dial}</span>
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/15 p-2.5 text-xs text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-neutral-900 shadow-lg transition active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Phone className="h-4 w-4" /> Recevoir le code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-3">
              {devCode && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-2.5 text-xs text-amber-100">
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
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none placeholder:text-white/40 focus:border-white/50"
                autoFocus
              />
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/15 p-2.5 text-xs text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-neutral-900 shadow-lg transition active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Valider et entrer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (resendIn > 0 || loading) return;
                  handleSend(new Event("submit") as unknown as React.FormEvent);
                }}
                disabled={resendIn > 0 || loading}
                className="block w-full text-center text-xs font-medium text-white/80 underline-offset-4 hover:underline disabled:text-white/40 disabled:no-underline"
              >
                {resendIn > 0 ? `Renvoyer le code dans ${resendIn}s` : "Renvoyer le code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                  setDevCode(null);
                }}
                className="block w-full text-center text-xs text-white/60 underline-offset-4 hover:underline"
              >
                Modifier le numéro
              </button>
            </form>
          )}
        </div>

        {/* Signup block */}
        <div className="mt-6 w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-center backdrop-blur-xl">
          <p className="text-sm text-white/80">
            Nouveau sur MboaEats ?{" "}
            <Link
              to="/inscription"
              className="font-bold text-white underline underline-offset-4 hover:text-orange-300"
            >
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/50">
          En continuant tu acceptes nos{" "}
          <Link to="/cgu" className="underline underline-offset-2 hover:text-white">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link to="/confidentialite" className="underline underline-offset-2 hover:text-white">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
