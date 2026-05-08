import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flame, ShieldCheck, Loader2, Check, AlertCircle, Mail, Phone, MessageCircle, Send, ChevronDown, ArrowRight } from "lucide-react";
import { sendOtp, verifyOtp, getOtpDeliveryConfig } from "@/lib/otp.functions";
import { claimAdminByPhone, checkAdminEligibility } from "@/lib/admin-claim.functions";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connectez-vous à MboaEats par téléphone ou email." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});



const COUNTRIES: { code: string; dial: string; flag: string; name: string }[] = [
  { code: "CM", dial: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgique" },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Suisse" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "États-Unis" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "Royaume-Uni" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Allemagne" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Espagne" },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "Italie" },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "NL", dial: "+31", flag: "🇳🇱", name: "Pays-Bas" },
  { code: "SN", dial: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "CI", dial: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "Maroc" },
  { code: "DZ", dial: "+213", flag: "🇩🇿", name: "Algérie" },
  { code: "TN", dial: "+216", flag: "🇹🇳", name: "Tunisie" },
  { code: "GA", dial: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "CG", dial: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "CD", dial: "+243", flag: "🇨🇩", name: "RD Congo" },
  { code: "BJ", dial: "+229", flag: "🇧🇯", name: "Bénin" },
  { code: "TG", dial: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "BF", dial: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "ML", dial: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigéria" },
  { code: "GH", dial: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "Afrique du Sud" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "Émirats Arabes Unis" },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Arabie Saoudite" },
  { code: "TR", dial: "+90", flag: "🇹🇷", name: "Turquie" },
  { code: "CN", dial: "+86", flag: "🇨🇳", name: "Chine" },
  { code: "JP", dial: "+81", flag: "🇯🇵", name: "Japon" },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "Inde" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brésil" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australie" },
];

type Mode = "phone" | "email";
type Channel = "sms" | "whatsapp" | "email";
type Step = "identify" | "channel" | "otp";

function formatPhoneForOtp(dial: string, raw: string) {
  const input = raw.trim();
  const digits = input.replace(/\D/g, "");
  const dialDigits = dial.replace(/\D/g, "");
  if (input.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith(dialDigits)) return `+${digits}`;
  return `${dial}${digits}`;
}

/** Detect a country from a raw phone input that may start with +indicatif or 00indicatif. */
function detectCountryFromInput(raw: string) {
  const input = raw.trim();
  let digits = "";
  if (input.startsWith("+")) digits = input.slice(1).replace(/\D/g, "");
  else if (input.replace(/\D/g, "").startsWith("00")) digits = input.replace(/\D/g, "").slice(2);
  else return null;
  if (!digits) return null;
  // Match longest dial code first to avoid +1 swallowing +1XX, etc.
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    const d = c.dial.replace(/\D/g, "");
    if (digits.startsWith(d)) return { country: c, rest: digits.slice(d.length) };
  }
  return null;
}

function Connexion() {
  const navigate = useNavigate();
  const sendOtpFn = useServerFn(sendOtp);
  const verifyOtpFn = useServerFn(verifyOtp);
  const checkAdminFn = useServerFn(checkAdminEligibility);
  const claimAdminFn = useServerFn(claimAdminByPhone);
  const getDeliveryConfigFn = useServerFn(getOtpDeliveryConfig);
  const [mode, setMode] = useState<Mode>("phone");
  const [step, setStep] = useState<Step>("identify");

  const [countryCode, setCountryCode] = useState("CM");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [code, setCode] = useState("");

  const [showCountries, setShowCountries] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [highlightedCountry, setHighlightedCountry] = useState(0);
  const countryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const countrySearchRef = useRef<HTMLInputElement | null>(null);
  const countryListRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsTrial, setSmsTrial] = useState(false);
  const [whatsappAvailable, setWhatsappAvailable] = useState(false);
  const [showWhatsAppFallback, setShowWhatsAppFallback] = useState(false);
  const RESEND_COOLDOWN = 45;
  const MAX_RESEND = 3;
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resendCount >= MAX_RESEND || loading) return;
    await sendCode();
    setResendCount((n) => n + 1);
    setCooldown(RESEND_COOLDOWN);
    setCode("");
  };

  useEffect(() => {
    let active = true;
    getDeliveryConfigFn()
      .then((cfg: any) => {
        if (!active) return;
        const waOk = Boolean(cfg?.whatsappAvailable);
        setWhatsappAvailable(waOk);
        if (cfg?.twilioTrial) {
          setSmsTrial(true);
          // Si WhatsApp n'est pas dispo non plus, bascule vers email par défaut
          if (waOk) setChannel("whatsapp");
          else setMode("email");
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [getDeliveryConfigFn]);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countryQuery]);

  // Reset highlight when filter changes / panel opens
  useEffect(() => {
    if (showCountries) setHighlightedCountry(0);
  }, [countryQuery, showCountries]);

  // Auto-focus search when opening; restore focus on close
  useEffect(() => {
    if (showCountries) {
      requestAnimationFrame(() => countrySearchRef.current?.focus());
    }
  }, [showCountries]);

  const closeCountries = (restoreFocus = true) => {
    setShowCountries(false);
    setCountryQuery("");
    if (restoreFocus) requestAnimationFrame(() => countryTriggerRef.current?.focus());
  };

  const selectCountry = (code: string) => {
    setCountryCode(code);
    closeCountries();
  };

  const handleCountryListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeCountries();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedCountry((i) => Math.min(i + 1, filteredCountries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedCountry((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlightedCountry(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlightedCountry(filteredCountries.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filteredCountries[highlightedCountry];
      if (c) selectCountry(c.code);
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (!showCountries) return;
    const el = countryListRef.current?.querySelector<HTMLElement>(
      `[data-country-index="${highlightedCountry}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedCountry, showCountries]);

  const identifierLabel =
    mode === "phone" ? formatPhoneForOtp(country.dial, phone) : email;

  const submitIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "phone") {
      if (phone.replace(/\D/g, "").length < 6) {
        setError("Numéro de téléphone invalide");
        return;
      }
      // Canal déjà choisi via le toggle SMS/WhatsApp -> on envoie directement
      await sendCode();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Adresse email invalide");
      return;
    }
    setChannel("email");
    await sendCode("email");
  };

  const sendCode = async (overrideChannel?: Channel) => {
    const ch = overrideChannel ?? channel;
    setError(null);
    setShowWhatsAppFallback(false);
    setLoading(true);
    try {
      if (mode === "phone" && (ch === "sms" || ch === "whatsapp")) {
        const fullPhone = formatPhoneForOtp(country.dial, phone);
        await sendOtpFn({ data: { phone: fullPhone, channel: ch } });
        if (overrideChannel) setChannel(overrideChannel);
        setStep("otp");
      } else if (mode === "email" || ch === "email") {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error: sErr } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
        });
        if (sErr) throw new Error(sErr.message);
        setChannel("email");
        setStep("otp");
      } else {
        setError("Ce canal n'est pas disponible.");
      }
      setCooldown((c) => (c === 0 ? RESEND_COOLDOWN : c));
    } catch (err: any) {
      const msg = err?.message ?? "Échec de l'envoi du code";
      setError(msg);
      if (ch === "sms" && /whatsapp/i.test(msg)) {
        setShowWhatsAppFallback(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Saisissez les 6 chiffres du code.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "phone" && (channel === "sms" || channel === "whatsapp")) {
        const fullPhone = formatPhoneForOtp(country.dial, phone);
        const res: any = await verifyOtpFn({ data: { phone: fullPhone, code: code.trim() } });
        if (res?.auth?.token_hash) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { error: vErr } = await supabase.auth.verifyOtp({
            type: "magiclink",
            token_hash: res.auth.token_hash,
          });
          if (vErr) throw new Error(vErr.message);
        }
      } else if (mode === "email") {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error: vErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: "email",
        });
        if (vErr) throw new Error(vErr.message);
      }
      const { invalidateSessionCache } = await import("@/hooks/useSessionUser");
      invalidateSessionCache();

      // Vérifier si ce compte est éligible à devenir admin
      try {
        // Attendre que la session soit bien persistée côté client avant
        // d'appeler les server functions protégées (sinon le fetch wrapper
        // n'attache pas le bearer token et on reçoit un 401 -> blank screen).
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          const status = await checkAdminFn().catch(() => null);
          if (status?.isAdmin) {
            navigate({ to: "/admin" });
            return;
          }
          if (status?.eligible) {
            await claimAdminFn().catch(() => null);
            navigate({ to: "/admin" });
            return;
          }
        }
      } catch {
        // ignore — utilisateur normal
      }
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err?.message ?? "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black" style={{ colorScheme: "light" }}>
      {/* Subtle Uber Eats green decorative arcs */}
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] w-full opacity-60"
        viewBox="0 0 1296 280"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-34 91C159 45 389 41 562 91C742 143 871 245 1040 240C1145 237 1235 196 1324 129" stroke="#06C167" strokeWidth="1.5" opacity="0.18" />
        <path d="M-18 195C193 138 423 126 609 183C776 234 868 264 1035 266C1133 267 1228 245 1323 220" stroke="#06C167" strokeWidth="1.5" opacity="0.12" />
        <circle cx="1107" cy="80" r="172" stroke="#06C167" strokeWidth="1.5" opacity="0.10" />
      </svg>

      <div className="absolute right-5 top-5 z-10">
        <button
          type="button"
          aria-label="Aide"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E2E2E2] bg-white text-[#06C167] shadow-sm transition hover:bg-[#06C167]/5"
        >
          <span className="text-xl font-black leading-none">?</span>
        </button>
      </div>

      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-10 pb-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#06C167] shadow-[0_10px_30px_-12px_rgba(6,193,103,0.55)]">
            <Flame className="h-10 w-10 text-white" strokeWidth={2.4} />
          </div>
          <h1 className="font-display text-[34px] font-black leading-none text-[#06C167]">MboaEats</h1>
          <h2 className="mt-3 text-[20px] font-bold leading-none text-black">Mboa Console</h2>
          <p className="mt-2 text-[15px] font-normal leading-snug text-[#6B6B6B]">
            Veuillez vous connecter pour continuer
          </p>
        </div>

        <div className="rounded-[24px] border border-[#EDEDED] bg-white p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] animate-fade-up">
          {step === "identify" && (
            <>
              {/* Mode tabs */}
              <div className="mb-6 grid h-[52px] grid-cols-2 gap-2 rounded-full bg-[#F6F6F6] p-1">
                <button
                  type="button"
                  onClick={() => { setMode("phone"); setError(null); }}
                  aria-pressed={mode === "phone"}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-3 text-[14px] font-bold transition ${
                    mode === "phone"
                      ? "bg-white text-[#2D2D2D] shadow-[0_2px_6px_-2px_rgba(0,122,255,0.25)] ring-1 ring-[#007AFF]"
                      : "bg-[#F6F6F6] text-[#6B6B6B] hover:text-[#2D2D2D]"
                  }`}
                >
                  <Phone strokeWidth={2} className={`h-4 w-4 ${mode === "phone" ? "text-[#007AFF]" : "text-[#9A9A9A]"}`} /> Téléphone
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("email"); setError(null); }}
                  aria-pressed={mode === "email"}
                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-3 text-[14px] font-bold transition ${
                    mode === "email"
                      ? "bg-white text-[#2D2D2D] shadow-[0_2px_6px_-2px_rgba(142,68,173,0.25)] ring-1 ring-[#8E44AD]"
                      : "bg-[#F6F6F6] text-[#6B6B6B] hover:text-[#2D2D2D]"
                  }`}
                >
                  <Mail strokeWidth={2} className={`h-4 w-4 ${mode === "email" ? "text-[#8E44AD]" : "text-[#9A9A9A]"}`} /> Email
                </button>
              </div>

              <form onSubmit={submitIdentify} className="space-y-5">
                {mode === "phone" ? (
                  <>
                    <label className="block text-[12px] font-bold uppercase tracking-[0.18em] text-[#6B6B6B]">
                      Numéro de téléphone
                    </label>
                    <div className="flex h-[56px] items-stretch gap-2">
                      {/* Country selector — bordered */}
                      <button
                        ref={countryTriggerRef}
                        type="button"
                        onClick={() => setShowCountries((v) => !v)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setShowCountries(true);
                          } else if (e.key === "Escape" && showCountries) {
                            e.preventDefault();
                            closeCountries(false);
                          }
                        }}
                        aria-label={`Indicatif pays : ${country.name} ${country.dial}`}
                        aria-haspopup="listbox"
                        aria-expanded={showCountries}
                        aria-controls="country-listbox"
                        className={`flex h-full shrink-0 items-center gap-2 rounded-[14px] border-2 bg-white px-3 text-sm font-semibold text-black transition-colors hover:border-[#06C167] focus:outline-none focus-visible:border-[#06C167] focus-visible:ring-2 focus-visible:ring-[#06C167]/30 ${showCountries ? "border-[#06C167] ring-2 ring-[#06C167]/30" : "border-[#E2E2E2]"}`}
                      >
                        <span className="text-[20px] leading-none" aria-hidden="true">{country.flag}</span>
                        <span className="font-display text-[16px] font-extrabold tracking-wide text-black tabular-nums">{country.dial}</span>
                        <ChevronDown className={`h-4 w-4 text-[#6B6B6B] transition-transform ${showCountries ? "rotate-180" : ""}`} strokeWidth={2.5} />
                      </button>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="Entrez votre numéro de téléphone"
                        value={phone}
                        onChange={(e) => {
                          const v = e.target.value;
                          const detected = detectCountryFromInput(v);
                          if (detected) {
                            setCountryCode(detected.country.code);
                            setPhone(detected.rest);
                          } else {
                            setPhone(v);
                          }
                        }}
                        className="h-full min-w-0 flex-1 rounded-[14px] border-2 border-[#E2E2E2] bg-white px-4 text-[16px] font-semibold text-black outline-none transition-colors placeholder:text-[#9A9A9A] placeholder:font-normal focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/30"
                        autoFocus
                      />
                    </div>

                    {showCountries && (
                      <div
                        className="rounded-2xl border border-[#E2E2E2] bg-white p-2 shadow-lg"
                        onKeyDown={handleCountryListKeyDown}
                      >
                        <input
                          ref={countrySearchRef}
                          type="text"
                          placeholder="Rechercher un pays ou indicatif…"
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          aria-label="Rechercher un pays"
                          aria-controls="country-listbox"
                          aria-activedescendant={
                            filteredCountries[highlightedCountry]
                              ? `country-opt-${filteredCountries[highlightedCountry].code}`
                              : undefined
                          }
                          className="mb-2 w-full rounded-lg border border-[#E2E2E2] bg-white px-3 py-2 text-sm text-black placeholder:text-[#9A9A9A] outline-none focus:border-[#06C167] focus-visible:ring-2 focus-visible:ring-[#06C167]/30"
                        />
                        <div
                          ref={countryListRef}
                          id="country-listbox"
                          role="listbox"
                          aria-label="Liste des pays"
                          tabIndex={-1}
                          className="max-h-56 overflow-y-auto focus:outline-none"
                        >
                          {filteredCountries.map((c, idx) => {
                            const active = idx === highlightedCountry;
                            const selected = c.code === countryCode;
                            return (
                              <button
                                key={c.code}
                                id={`country-opt-${c.code}`}
                                data-country-index={idx}
                                role="option"
                                aria-selected={selected}
                                type="button"
                                tabIndex={-1}
                                onMouseEnter={() => setHighlightedCountry(idx)}
                                onClick={() => selectCountry(c.code)}
                                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-black transition focus:outline-none ${active ? "bg-[#06C167]/10 ring-1 ring-[#06C167]/40" : "hover:bg-[#F5F5F5]"} ${selected ? "bg-[#F0F0F0]" : ""}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-base leading-none">{c.flag}</span>
                                  <span>{c.name}</span>
                                </span>
                                <span className="text-xs text-[#6B6B6B]">{c.dial}</span>
                              </button>
                            );
                          })}
                          {filteredCountries.length === 0 && (
                            <p className="px-3 py-4 text-center text-xs text-[#6B6B6B]">Aucun pays trouvé</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <label className="block text-[12px] font-bold uppercase tracking-[0.18em] text-[#6B6B6B]">
                      Adresse email
                    </label>
                    <div className="flex h-[56px] items-center gap-3 rounded-[14px] border border-[#E2E2E2] bg-white px-4 transition focus-within:border-[#06C167] focus-within:ring-2 focus-within:ring-[#06C167]/30">
                      <Mail className="h-5 w-5 text-[#06C167]" />
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="vous@exemple.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-black outline-none placeholder:text-[#9A9A9A] placeholder:font-normal"
                        autoFocus
                      />
                    </div>
                  </>
                )}

                {mode === "phone" && smsTrial && whatsappAvailable && (
                  <div className="rounded-xl border border-[#06C167]/30 bg-[#06C167]/5 p-3 text-xs text-black">
                    🔔 Le service SMS est temporairement indisponible. Recevez votre code par WhatsApp — gratuit et immédiat.
                  </div>
                )}

                {mode === "phone" && smsTrial && !whatsappAvailable && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-xs text-black">
                    ⚠️ SMS et WhatsApp temporairement indisponibles. Utilisez votre <button type="button" onClick={() => setMode("email")} className="font-semibold text-[#06C167] underline">email</button> pour vous connecter immédiatement.
                  </div>
                )}

                {mode === "phone" && !smsTrial && (
                  <div>
                    <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#6B6B6B]">
                      Recevoir le code par
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setChannel("sms"); setError(null); setShowWhatsAppFallback(false); }}
                        aria-pressed={channel === "sms"}
                        className={`flex min-h-[44px] h-[52px] items-center justify-center gap-2 rounded-full border text-[15px] font-semibold text-[#2D2D2D] transition ${
                          channel === "sms"
                            ? "border-[#F39C12] bg-[#FFF8EC] shadow-[0_2px_6px_-2px_rgba(243,156,18,0.25)]"
                            : "border-[#F39C12]/40 bg-[#FFFBF2] hover:border-[#F39C12]/70"
                        }`}
                      >
                        <MessageCircle strokeWidth={2} className="h-4 w-4 text-[#F39C12]" /> SMS
                      </button>
                      {whatsappAvailable ? (
                        <button
                          type="button"
                          onClick={() => { setChannel("whatsapp"); setError(null); setShowWhatsAppFallback(false); }}
                          aria-pressed={channel === "whatsapp"}
                          className={`flex min-h-[44px] h-[52px] items-center justify-center gap-2 rounded-full border text-[15px] font-semibold text-[#2D2D2D] transition ${
                            channel === "whatsapp"
                              ? "border-[#25D366] bg-[#25D366]/10 shadow-[0_2px_6px_-2px_rgba(37,211,102,0.25)]"
                              : "border-[#25D366]/40 bg-[#25D366]/5 hover:border-[#25D366]/70"
                          }`}
                        >
                          <Send strokeWidth={2} className="h-4 w-4 text-[#25D366]" /> WhatsApp
                        </button>
                      ) : (
                        <div
                          className="flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full border border-dashed border-[#A8D5BA] bg-[#F5FBF7] text-center text-[13px] font-semibold text-[#6B6B6B]"
                          aria-disabled
                          title="WhatsApp pas encore activé sur ce compte"
                        >
                          <span className="flex items-center gap-1.5"><Send strokeWidth={2} className="h-3.5 w-3.5 text-[#A8D5BA]" /> WhatsApp</span>
                          <span className="text-[10px] opacity-80">Bientôt disponible</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="flex items-start gap-2 text-[12px] leading-snug text-[#6B6B6B]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#06C167]" />
                  Un code à 6 chiffres vous sera envoyé par {mode === "phone" ? (channel === "whatsapp" ? "WhatsApp" : "SMS") : "email"} pour confirmer votre identité.
                </p>

                {error && (
                  <div className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-black">
                    <div className="flex items-start gap-2 text-red-600">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold">Impossible d'envoyer le code</p>
                        <p className="opacity-90">{error}</p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-black">
                        ✨ Solutions immédiates
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {mode === "phone" && channel !== "whatsapp" && whatsappAvailable && (
                          <button
                            type="button"
                            onClick={() => sendCode("whatsapp")}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-[11px] font-semibold text-white shadow disabled:opacity-60"
                          >
                            <Send className="h-3 w-3" /> Essayer WhatsApp
                          </button>
                        )}
                        {mode === "phone" && channel !== "sms" && (
                          <button
                            type="button"
                            onClick={() => sendCode("sms")}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E2E2] bg-white px-3 py-1.5 text-[11px] font-semibold text-black"
                          >
                            <MessageCircle className="h-3 w-3" /> Essayer SMS
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setMode("email"); setError(null); setShowWhatsAppFallback(false); }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#06C167] px-3 py-1.5 text-[11px] font-semibold text-white"
                        >
                          <Mail className="h-3 w-3" /> Utiliser mon email
                        </button>
                        <a
                          href={`https://wa.me/237699999999?text=${encodeURIComponent(
                            `Bonjour MboaEats, je n'arrive pas à recevoir mon code de connexion. Mon numéro est : ${
                              mode === "phone" && phone ? formatPhoneForOtp(country.dial, phone) : email || "(non renseigné)"
                            }`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#25D366]"
                        >
                          <Send className="h-3 w-3" /> Aide humaine
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="relative inline-flex min-h-[44px] h-[56px] w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-[#06C167] text-[15px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_-12px_rgba(6,193,103,0.65)] transition hover:bg-[#05a557] active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<>SE CONNECTER <ArrowRight className="h-5 w-5" /></>)}
                </button>

                <div className="mt-6 flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    onClick={() => { if (identifierLabel && (phone || email)) setStep("otp"); }}
                    className="text-[14px] font-medium text-[#6B6B6B] transition hover:text-[#06C167] focus:outline-none focus-visible:underline"
                  >
                    Vérifier le code ?
                  </button>
                  <a
                    href="https://wa.me/237699999999?text=Bonjour%20MboaEats%2C%20j%27ai%20besoin%20d%27aide%20pour%20me%20connecter."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-medium text-[#6B6B6B] transition hover:text-[#06C167] focus:outline-none focus-visible:underline"
                  >
                    Veuillez contacter l'administrateur ?
                  </a>
                </div>

              </form>
            </>
          )}

          {step === "channel" && (
            <div className="space-y-4 animate-fade-up">
              <p className="text-xs text-muted-foreground">
                Recevoir le code sur <span className="font-semibold text-foreground">{identifierLabel}</span>
              </p>

              <div className="space-y-2">
                {mode === "phone" && (
                  <>
                    <ChannelOption icon={<MessageCircle className="h-4 w-4" />} label="SMS" desc="Message texte international" active={channel === "sms"} onClick={() => setChannel("sms")} />
                    <ChannelOption icon={<Send className="h-4 w-4" />} label="WhatsApp" desc="Code envoyé sur WhatsApp" active={channel === "whatsapp"} onClick={() => setChannel("whatsapp")} />
                  </>
                )}
                <ChannelOption icon={<Mail className="h-4 w-4" />} label="Email" desc="Code de confirmation par email" active={channel === "email"} onClick={() => setChannel("email")} />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("identify")}
                  className="h-12 flex-1 rounded-full border border-border bg-background text-sm font-semibold text-muted-foreground"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={() => sendCode()}
                  disabled={loading}
                  className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le code"}
                </button>
              </div>
            </div>
          )}

          {step === "otp" && (
            <form id="otp-form" onSubmit={submitCode} className="space-y-5 animate-fade-up">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#06C167] shadow-[0_8px_22px_-8px_rgba(6,193,103,0.55)]">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h2 className="font-display text-xl font-bold text-black">Vérification</h2>
                <p className="mt-1 text-sm text-[#6B6B6B]">
                  {channel === "whatsapp" ? "Code envoyé par WhatsApp" : channel === "email" ? "Code envoyé par email" : "Code envoyé par SMS"} à
                </p>
                <p className="mt-1 text-sm font-semibold text-[#06C167]">{identifierLabel}</p>
              </div>

              <div>
                <label className="mb-3 block text-center text-[11px] font-bold uppercase tracking-[0.25em] text-[#6B6B6B]">
                  Saisissez les 6 chiffres
                </label>
                <OtpInput value={code} onChange={setCode} onComplete={() => {
                  const form = document.getElementById("otp-form") as HTMLFormElement | null;
                  form?.requestSubmit();
                }} />
                <input id="otp-form-hidden" type="hidden" />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="relative inline-flex min-h-[44px] h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] bg-[#06C167] text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_-12px_rgba(6,193,103,0.65)] transition hover:bg-[#05a557] active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><Check className="h-4 w-4" /> Valider</>)}
              </button>

              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resendCount >= MAX_RESEND || loading}
                  className="text-sm font-semibold text-[#06C167] transition hover:text-[#05a557] disabled:text-[#9A9A9A] disabled:cursor-not-allowed focus:outline-none focus-visible:underline"
                >
                  {resendCount >= MAX_RESEND
                    ? "Limite de renvois atteinte"
                    : cooldown > 0
                      ? `Renvoyer le code dans ${cooldown}s`
                      : "Renvoyer le code"}
                </button>
                <p className="text-[11px] text-[#9A9A9A]">
                  {resendCount}/{MAX_RESEND} tentatives utilisées
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep("identify"); setCode(""); setError(null); setResendCount(0); setCooldown(0); }}
                className="block w-full text-center text-xs text-[#6B6B6B] underline-offset-4 hover:text-black hover:underline focus:outline-none focus-visible:underline"
              >
                ← Modifier {mode === "phone" ? "le numéro" : "l'email"}
              </button>
            </form>
          )}
        </div>

        {/* Lien admin retiré de l'interface publique. Accès via /admin/login uniquement. */}

        <div className="hidden mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-xs text-white/60 backdrop-blur-xl">
          <p className="mb-2 font-semibold text-white">Vous ne recevez pas de code ?</p>
          <p className="mb-3">Contactez-nous sur WhatsApp, on vous inscrit manuellement en quelques minutes.</p>
          <a
            href={`https://wa.me/237699999999?text=${encodeURIComponent(
              `Bonjour MboaEats, j'ai besoin de m'inscrire mais je ne reçois pas de code. Mon numéro est : ${
                mode === "phone" && phone ? formatPhoneForOtp(country.dial, phone) : "+__________"
              }`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90"
          >
            <Send className="h-3.5 w-3.5" /> Demander de l'aide sur WhatsApp
          </a>
        </div>

        <p className="hidden mt-4 text-center text-[11px] text-white/55">
          Support : <a className="text-[#ffb38a] hover:underline" href="mailto:lionelbrown2728@yahoo.fr">lionelbrown2728@yahoo.fr</a>
        </p>
      </div>
    </div>
  );
}

function ChannelOption({
  icon, label, desc, active, onClick,
}: { icon: React.ReactNode; label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"}`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-gradient-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      {active && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
}

function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusIndex = (i: number) => {
    const idx = Math.max(0, Math.min(length - 1, i));
    const el = refs.current[idx];
    if (!el) return;
    el.focus();
    // requestAnimationFrame ensures select() works after focus on iOS Safari
    requestAnimationFrame(() => {
      try { el.select(); } catch {}
    });
  };

  /** Insert one or many digits starting at index `i`, distributing across cells. */
  const insertAt = (i: number, raw: string) => {
    const sanitized = raw.replace(/\D/g, "");
    if (!sanitized) return;
    const chars = Array.from({ length }, (_, k) => value[k] ?? "");
    let cursor = i;
    for (const ch of sanitized) {
      if (cursor >= length) break;
      chars[cursor] = ch;
      cursor++;
    }
    const next = chars.join("").slice(0, length);
    onChange(next);
    focusIndex(Math.min(length - 1, cursor));
    if (next.replace(/\s/g, "").length === length) onComplete?.(next);
  };

  const handleChange = (i: number, raw: string) => {
    // Browsers (and iOS one-time-code autofill) may deliver several digits at once.
    insertAt(i, raw);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, i: number) => {
    const txt = e.clipboardData.getData("text");
    if (!txt) return;
    e.preventDefault();
    insertAt(i, txt);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    const key = e.key;
    if (key === "Backspace") {
      e.preventDefault();
      const chars = Array.from({ length }, (_, k) => value[k] ?? "");
      if (chars[i]) {
        chars[i] = "";
        onChange(chars.join(""));
      } else if (i > 0) {
        chars[i - 1] = "";
        onChange(chars.join(""));
        focusIndex(i - 1);
      }
    } else if (key === "Delete") {
      e.preventDefault();
      const chars = Array.from({ length }, (_, k) => value[k] ?? "");
      chars[i] = "";
      onChange(chars.join(""));
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (key === "ArrowRight") {
      e.preventDefault();
      focusIndex(i + 1);
    } else if (key === "Home") {
      e.preventDefault();
      focusIndex(0);
    } else if (key === "End") {
      e.preventDefault();
      focusIndex(length - 1);
    } else if (/^[0-9]$/.test(key) && digits[i]) {
      // Overwrite the current cell instead of being blocked by maxLength.
      e.preventDefault();
      insertAt(i, key);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="Code de vérification">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={(e) => handlePaste(e, i)}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Chiffre ${i + 1}`}
          className="h-14 w-11 sm:w-12 rounded-xl border border-[#E2E2E2] bg-white text-center text-2xl font-bold text-black outline-none transition focus:border-[#06C167] focus:ring-2 focus:ring-[#06C167]/30 focus-visible:ring-2 focus-visible:ring-[#06C167]/40"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
