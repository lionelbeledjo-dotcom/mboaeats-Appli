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
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06C167]">
            <span className="text-3xl">🍲</span>
          </div>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-black">MboaEats</h2>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-white p-6 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-neutral-100">
          <h1 className="text-center text-2xl font-bold tracking-tight text-black">
            {step === "phone" ? "Connexion" : "Vérification"}
          </h1>
          <p className="mt-1 text-center text-sm text-[#6B6B6B]">
            {step === "phone"
              ? "Entrez votre numéro pour recevoir un code"
              : `Code envoyé au ${fullPhone}`}
          </p>

          {step === "phone" ? (
            <form onSubmit={handleSend} className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCountries((v) => !v)}
                  className="flex h-12 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-sm font-semibold text-black hover:bg-neutral-50"
                >
                  <span className="text-base leading-none">{country.flag}</span>
                  <span>{country.dial}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#6B6B6B]" />
                </button>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="6XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 flex-1 rounded-xl bg-[#F6F6F6] px-4 text-base font-medium text-black placeholder:text-[#9b9b9b] outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              {showCountries && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountryCode(c.code);
                        setShowCountries(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-black hover:bg-neutral-50 ${
                        c.code === countryCode ? "bg-neutral-50" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="text-xs text-[#6B6B6B]">{c.dial}</span>
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C167] text-sm font-bold text-white transition hover:bg-[#05a857] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Recevoir le code
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-3">
              {devCode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
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
                className="w-full rounded-xl bg-[#F6F6F6] px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-black placeholder:text-[#c4c4c4] outline-none focus:ring-2 focus:ring-black/10"
                autoFocus
              />
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C167] text-sm font-bold text-white transition hover:bg-[#05a857] active:scale-[0.99] disabled:opacity-60"
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
                className="block w-full text-center text-xs font-medium text-black underline-offset-4 hover:underline disabled:text-[#9b9b9b] disabled:no-underline"
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
                className="block w-full text-center text-xs text-[#6B6B6B] underline-offset-4 hover:underline"
              >
                Modifier le numéro
              </button>
            </form>
          )}
        </div>

        {/* Signup block */}
        <div className="mt-6 w-full text-center">
          <p className="text-sm text-black">
            Nouveau sur MboaEats ?{" "}
            <Link
              to="/inscription"
              className="font-bold text-[#06C167] hover:underline underline-offset-4"
            >
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#6B6B6B]">
          En continuant tu acceptes nos{" "}
          <Link to="/cgu" className="underline underline-offset-2 hover:text-black">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link to="/confidentialite" className="underline underline-offset-2 hover:text-black">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
