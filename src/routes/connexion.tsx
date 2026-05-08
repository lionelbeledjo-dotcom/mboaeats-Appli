import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, AlertCircle, ArrowRight, Mail, Lock, Eye, EyeOff,
  Phone, ChevronDown, Check, ShieldCheck, Pencil,
} from "lucide-react";
import { loginWithPassword, accountExists } from "@/lib/auth.functions";
import { sendOtp, verifyOtp } from "@/lib/otp.functions";
import { useAuth } from "@/hooks/useAuth";
import { invalidateSessionCache } from "@/hooks/useSessionUser";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connectez-vous à MboaEats par email ou par téléphone." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

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

type Tab = "email" | "phone";

function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focusAt = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(5, i))];
    el?.focus();
    el?.select();
  };

  const setDigit = (i: number, d: string) => {
    const clean = d.replace(/\D/g, "").slice(0, 1);
    const arr = digits.slice();
    arr[i] = clean;
    const next = arr.join("").slice(0, 6);
    onChange(next);
    if (clean && i < 5) focusAt(i + 1);
    if (next.length === 6) onComplete?.(next);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    focusAt(Math.min(text.length, 5));
    if (text.length === 6) onComplete?.(text);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const arr = digits.slice();
        arr[i] = "";
        onChange(arr.join(""));
      } else if (i > 0) {
        const arr = digits.slice();
        arr[i - 1] = "";
        onChange(arr.join(""));
        focusAt(i - 1);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2" role="group" aria-label="Code à 6 chiffres">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Chiffre ${i + 1}`}
          className={`h-14 w-full min-w-0 max-w-[52px] rounded-xl bg-[#F6F6F6] text-center text-2xl font-bold text-black outline-none ring-1 transition focus:bg-white ${
            hasError
              ? "ring-red-300 focus:ring-red-500"
              : "ring-transparent focus:ring-[#06C167]"
          } disabled:opacity-60`}
        />
      ))}
    </div>
  );
}

function Connexion() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const loginFn = useServerFn(loginWithPassword);
  const existsFn = useServerFn(accountExists);
  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);

  const [tab, setTab] = useState<Tab>("email");

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Phone form
  const [countryCode, setCountryCode] = useState("CM");
  const [phone, setPhone] = useState("");
  const [showCountries, setShowCountries] = useState(false);
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Common
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resentOk, setResentOk] = useState(false);

  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0],
    [countryCode],
  );
  const fullPhone = `${country.dial}${phone.replace(/\D/g, "")}`;

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate({ to: "/", replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  function resetMessages() {
    setError(null);
    setErrorCode(null);
    setResentOk(false);
  }

  // ── Email submit ─────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Adresse email invalide");
      return;
    }
    if (password.length < 6) {
      setError("Mot de passe requis");
      return;
    }

    setLoading(true);
    try {
      const res = await loginFn({ data: { email: trimmed, password } });
      if (!res.ok) {
        setError(res.message);
        setErrorCode(res.code);
        return;
      }
      await supabase.auth.signInWithPassword({ email: trimmed, password });
      invalidateSessionCache();
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirm = async () => {
    setResendBusy(true);
    setResentOk(false);
    try {
      await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/connexion` },
      });
      setResentOk(true);
    } catch { /* ignore */ } finally {
      setResendBusy(false);
    }
  };

  // ── Phone: send OTP (gated by account existence) ─────────
  const sendCode = async (channel: "sms" | "email") => {
    resetMessages();
    if (phone.replace(/\D/g, "").length < 6) {
      setError("Numéro invalide");
      return;
    }
    setLoading(true);
    try {
      const check = await existsFn({ data: { kind: "phone", identifier: fullPhone } });
      if (!check.ok || !check.exists) {
        setError("Ce compte n'existe pas. Veuillez vous inscrire.");
        setErrorCode("compte_inexistant");
        return;
      }
      if (channel === "email") {
        // Email channel for phone-based account is not supported on server today
        setError("La réception par email n'est disponible qu'avec un compte email. Choisissez l'onglet Email.");
        return;
      }
      const res: any = await sendOtpFn({ data: { phone: fullPhone, channel: "sms" } });
      if (res?.ok === false) {
        setError(res.error ?? "Échec de l'envoi du SMS");
        if (typeof res.retryAfter === "number") setResendIn(res.retryAfter);
        return;
      }
      setOtpStep("otp");
      setResendIn(30);
      if (res?.devCode) setDevCode(String(res.devCode));
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    resetMessages();
    if (!/^\d{6}$/.test(code)) {
      setError("Saisissez les 6 chiffres reçus.");
      return;
    }
    setLoading(true);
    try {
      const res: any = await verifyOtpFn({ data: { phone: fullPhone, code } });
      if (res?.auth?.token_hash) {
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
      setOtpCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    void verifyCode(otpCode.trim());
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06C167]">
            <span className="text-3xl">🍲</span>
          </div>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-black">MboaEats</h2>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl bg-white p-6 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-neutral-100">
          <h1 className="text-center text-2xl font-bold tracking-tight text-black">Connexion</h1>
          <p className="mt-1 text-center text-sm text-[#6B6B6B]">
            Choisissez votre méthode de connexion
          </p>

          {/* Tabs */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-[#F1F1F1] p-1">
            <button
              type="button"
              onClick={() => { setTab("email"); resetMessages(); }}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-bold transition ${
                tab === "email" ? "bg-white text-black shadow-sm" : "text-[#6B6B6B]"
              }`}
            >
              <Mail className="h-4 w-4" /> Email
            </button>
            <button
              type="button"
              onClick={() => { setTab("phone"); resetMessages(); }}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-bold transition ${
                tab === "phone" ? "bg-white text-black shadow-sm" : "text-[#6B6B6B]"
              }`}
            >
              <Phone className="h-4 w-4" /> Téléphone (SMS)
            </button>
          </div>

          {/* ── EMAIL TAB ── */}
          {tab === "email" && (
            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-3" noValidate>
              <label className="flex h-12 items-center gap-3 rounded-xl bg-[#F6F6F6] px-4 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-[#06C167]">
                <Mail className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-[#9b9b9b] outline-none"
                />
              </label>

              <label className="flex h-12 items-center gap-3 rounded-xl bg-[#F6F6F6] px-4 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-[#06C167]">
                <Lock className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-[#9b9b9b] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-[#6B6B6B] hover:text-black"
                  aria-label={showPwd ? "Masquer" : "Afficher"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </label>

              <div className="flex justify-end">
                <Link to="/reset-password" className="text-xs font-medium text-[#06C167] hover:underline underline-offset-4">
                  Mot de passe oublié ?
                </Link>
              </div>

              {error && (
                <div className="space-y-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                  {errorCode === "compte_inexistant" && (
                    <Link to="/inscription" className="block rounded-lg bg-white px-3 py-1.5 text-center text-xs font-bold text-[#06C167] ring-1 ring-red-100 hover:bg-red-50">
                      Créer un compte →
                    </Link>
                  )}
                  {errorCode === "email_non_confirme" && (
                    <button
                      type="button"
                      onClick={handleResendConfirm}
                      disabled={resendBusy}
                      className="block w-full rounded-lg bg-white px-3 py-1.5 text-center text-xs font-bold text-[#06C167] ring-1 ring-red-100 hover:bg-red-50 disabled:opacity-60"
                    >
                      {resendBusy ? "Envoi..." : resentOk ? "✓ Email renvoyé" : "Renvoyer l'email de confirmation"}
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C167] text-sm font-bold text-white transition hover:bg-[#05a857] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Se connecter <ArrowRight className="h-4 w-4" /></>)}
              </button>
            </form>
          )}

          {/* ── PHONE TAB ── */}
          {tab === "phone" && otpStep === "phone" && (
            <div className="mt-6 space-y-3">
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setShowCountries((v) => !v)}
                  className="flex h-12 items-center gap-2 rounded-xl bg-[#F6F6F6] px-3 text-sm font-semibold text-black ring-1 ring-transparent transition hover:bg-[#EFEFEF] focus:outline-none focus:ring-[#06C167]"
                  aria-expanded={showCountries}
                >
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white text-base ring-1 ring-neutral-200">
                    {country.flag}
                  </span>
                  <span>{country.dial}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#6B6B6B]" />
                </button>

                <label className="flex h-12 flex-1 items-center gap-3 rounded-xl bg-[#F6F6F6] px-4 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-[#06C167]">
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Entrez votre numéro"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-[#9b9b9b] outline-none"
                  />
                </label>
              </div>

              {showCountries && (
                <div className="max-h-56 overflow-y-auto rounded-xl bg-white p-1.5 ring-1 ring-neutral-200">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setCountryCode(c.code); setShowCountries(false); }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[#F6F6F6] ${c.code === countryCode ? "bg-[#F6F6F6]" : ""}`}
                    >
                      <span className="flex items-center gap-2 text-black">
                        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white text-base ring-1 ring-neutral-200">
                          {c.flag}
                        </span>
                        <span className="font-medium">{c.name}</span>
                      </span>
                      <span className="text-xs text-[#6B6B6B]">{c.dial}</span>
                    </button>
                  ))}
                </div>
              )}

              <p className="flex items-start gap-2 text-[11px] leading-snug text-[#6B6B6B]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#06C167]" />
                Un code à 6 chiffres vous sera envoyé. Seuls les comptes inscrits peuvent recevoir un code.
              </p>

              {error && (
                <div className="space-y-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                  {errorCode === "compte_inexistant" && (
                    <Link to="/inscription" className="block rounded-lg bg-white px-3 py-1.5 text-center text-xs font-bold text-[#06C167] ring-1 ring-red-100 hover:bg-red-50">
                      Créer un compte →
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => sendCode("sms")}
                disabled={loading}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C167] text-sm font-bold text-white transition hover:bg-[#05a857] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Recevoir le code par SMS <ArrowRight className="h-4 w-4" /></>)}
              </button>

              <button
                type="button"
                onClick={() => sendCode("email")}
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black ring-1 ring-neutral-200 transition hover:bg-[#F6F6F6] disabled:opacity-60"
              >
                <Mail className="h-4 w-4" /> Recevoir le code par Email
              </button>
            </div>
          )}

          {tab === "phone" && otpStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-3">
              <div className="rounded-xl bg-[#F6F6F6] p-3 text-xs text-black">
                📩 Code envoyé au <span className="font-bold">{fullPhone}</span>
              </div>
              {devCode && (
                <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
                  🛠️ Mode dev — code : <span className="font-mono font-bold">{devCode}</span>
                </div>
              )}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-[#F6F6F6] px-4 py-3.5 text-center text-xl font-bold tracking-[0.5em] text-black outline-none ring-1 ring-transparent focus:bg-white focus:ring-[#06C167]"
                autoFocus
              />
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C167] text-sm font-bold text-white hover:bg-[#05a857] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Check className="h-4 w-4" /> Valider et entrer</>)}
              </button>
              <button
                type="button"
                onClick={() => sendCode("sms")}
                disabled={resendIn > 0 || loading}
                className="block w-full text-center text-xs font-bold text-[#06C167] underline-offset-4 hover:underline disabled:text-[#9b9b9b] disabled:no-underline"
              >
                {resendIn > 0 ? `Renvoyer le code dans ${resendIn}s` : "Renvoyer le code"}
              </button>
              <button
                type="button"
                onClick={() => { setOtpStep("phone"); setOtpCode(""); resetMessages(); setDevCode(null); }}
                className="block w-full text-center text-xs text-[#6B6B6B] underline-offset-4 hover:underline"
              >
                Modifier le numéro
              </button>
            </form>
          )}
        </div>

        {/* Signup */}
        <div className="mt-6 w-full text-center">
          <p className="text-sm text-black">
            Nouveau sur MboaEats ?{" "}
            <Link to="/inscription" className="font-bold text-[#06C167] hover:underline underline-offset-4">
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#6B6B6B]">
          En continuant tu acceptes nos{" "}
          <Link to="/cgu" className="underline underline-offset-2 hover:text-black">CGU</Link>{" "}
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
