import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flame, ShieldCheck, Loader2, Check, AlertCircle, Mail, Phone, MessageCircle, Send, ChevronDown } from "lucide-react";
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
        const status = await checkAdminFn();
        if (status.isAdmin) {
          navigate({ to: "/admin" });
          return;
        }
        if (status.eligible) {
          await claimAdminFn();
          navigate({ to: "/admin" });
          return;
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
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0f] text-white">
      {/* Radiant amber decorations top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] overflow-hidden">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 400 360"
          fill="none"
          preserveAspectRatio="xMidYMin slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="amberStrokeC" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <radialGradient id="amberGlowC" cx="50%" cy="0%" r="65%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="360" fill="url(#amberGlowC)" />
          <path d="M -40 90 Q 120 20 280 100 T 460 70" stroke="url(#amberStrokeC)" strokeWidth="1.5" opacity="0.7" fill="none" />
          <path d="M -40 140 Q 140 70 300 150 T 480 120" stroke="url(#amberStrokeC)" strokeWidth="1" opacity="0.5" fill="none" />
          <path d="M -40 40 Q 100 -10 240 50 T 460 20" stroke="url(#amberStrokeC)" strokeWidth="1" opacity="0.4" fill="none" />
          <circle cx="340" cy="70" r="80" stroke="url(#amberStrokeC)" strokeWidth="1.2" opacity="0.6" fill="none" />
          <circle cx="340" cy="70" r="115" stroke="url(#amberStrokeC)" strokeWidth="0.8" opacity="0.35" fill="none" />
          <circle cx="60" cy="50" r="48" stroke="#fbbf24" strokeWidth="0.8" opacity="0.4" fill="none" />
          <line x1="20" y1="200" x2="120" y2="200" stroke="#fbbf24" strokeWidth="1" opacity="0.3" />
          <line x1="280" y1="220" x2="380" y2="220" stroke="#f97316" strokeWidth="1" opacity="0.4" />
        </svg>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        {/* Brand — logo + tagline */}
        <div className="mb-10 flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-3xl blur-2xl opacity-70"
              style={{ background: "radial-gradient(circle, #f97316 0%, transparent 70%)" }}
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_40px_rgba(251,146,60,0.5)]">
              <Flame className="h-8 w-8 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">MboaEats</h1>
            <p className="mt-2 text-sm font-light text-white/60">
              Veuillez vous connecter pour continuer
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-fade-up">
          {step === "identify" && (
            <>
              {/* Mode tabs */}
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
                <button
                  type="button"
                  onClick={() => { setMode("phone"); setError(null); }}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${mode === "phone" ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(212,175,108,0.5)]" : "text-white/55"}`}
                >
                  <Phone className="h-3.5 w-3.5" /> Téléphone
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("email"); setError(null); }}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${mode === "email" ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(212,175,108,0.5)]" : "text-white/55"}`}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
              </div>

              <form onSubmit={submitIdentify} className="space-y-5">
                {mode === "phone" ? (
                  <>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                      Numéro de téléphone
                    </label>
                    {/* Glassmorphism block — copper border + gold separator */}
                    <div className="group relative flex items-stretch overflow-hidden rounded-2xl border border-[#f59e0b]/60 bg-white/[0.06] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_40px_-20px_rgba(212,175,108,0.4)] focus-within:border-[#fbbf24] focus-within:ring-2 focus-within:ring-amber-400/40">
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
                        aria-label="Choisir le pays"
                        aria-haspopup="listbox"
                        aria-expanded={showCountries}
                        aria-controls="country-listbox"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f] rounded-l-2xl"
                      >
                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/10 text-base leading-none ring-1 ring-white/15">
                          {country.flag}
                        </span>
                        <span className="font-display text-base font-bold tracking-wide">{country.dial}</span>
                        <ChevronDown className={`h-3.5 w-3.5 text-[#f59e0b] transition-transform ${showCountries ? "rotate-180" : ""}`} strokeWidth={2.4} />
                      </button>
                      <span
                        aria-hidden
                        className="my-3 w-px bg-gradient-to-b from-transparent via-[#f59e0b]/70 to-transparent"
                      />
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="Entrez votre numéro de téléphone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#f59e0b]/60 rounded-r-2xl"
                        autoFocus
                      />
                    </div>

                    {showCountries && (
                      <div
                        className="rounded-2xl border border-white/10 bg-[#0d0d0f]/90 p-2 backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
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
                          className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#f59e0b]/70 focus-visible:ring-2 focus-visible:ring-[#f59e0b]"
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
                                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-white/90 transition focus:outline-none ${active ? "bg-[#f59e0b]/20 ring-1 ring-[#f59e0b]/60" : "hover:bg-white/10"} ${selected ? "bg-white/10" : ""}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/10 text-base leading-none ring-1 ring-white/15">{c.flag}</span>
                                  <span>{c.name}</span>
                                </span>
                                <span className="text-xs text-white/55">{c.dial}</span>
                              </button>
                            );
                          })}
                          {filteredCountries.length === 0 && (
                            <p className="px-3 py-4 text-center text-xs text-white/55">Aucun pays trouvé</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                      Adresse email
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-[#f59e0b]/60 bg-white/[0.06] backdrop-blur-2xl px-3 py-1.5 focus-within:border-[#fbbf24] focus-within:ring-2 focus-within:ring-amber-400/40">
                      <Mail className="h-4 w-4 text-[#f59e0b]" />
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="vous@exemple.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-white/40"
                        autoFocus
                      />
                    </div>
                  </>
                )}

                {mode === "phone" && smsTrial && whatsappAvailable && (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
                    🔔 Le service SMS est temporairement indisponible. Recevez votre code par WhatsApp — gratuit et immédiat.
                  </div>
                )}

                {mode === "phone" && smsTrial && !whatsappAvailable && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
                    ⚠️ SMS et WhatsApp temporairement indisponibles. Utilisez votre <button type="button" onClick={() => setMode("email")} className="font-semibold text-primary underline">email</button> pour vous connecter immédiatement.
                  </div>
                )}

                {mode === "phone" && !smsTrial && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recevoir le code par
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setChannel("sms"); setError(null); setShowWhatsAppFallback(false); }}
                        className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition ${channel === "sms" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted/40"}`}
                      >
                        <MessageCircle className="h-4 w-4" /> SMS
                      </button>
                      {whatsappAvailable ? (
                        <button
                          type="button"
                          onClick={() => { setChannel("whatsapp"); setError(null); setShowWhatsAppFallback(false); }}
                          className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition ${channel === "whatsapp" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted/40"}`}
                        >
                          <Send className="h-4 w-4" /> WhatsApp
                        </button>
                      ) : (
                        <div
                          className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-dashed border-border bg-muted/20 p-3 text-center text-[11px] font-medium text-muted-foreground"
                          aria-disabled
                          title="WhatsApp pas encore activé sur ce compte"
                        >
                          <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> WhatsApp</span>
                          <span className="text-[10px] opacity-70">Bientôt disponible</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Un code à 6 chiffres vous sera envoyé par {mode === "phone" ? (channel === "whatsapp" ? "WhatsApp" : "SMS") : "email"} pour confirmer votre identité.
                </p>

                {error && (
                  <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold">Impossible d'envoyer le code</p>
                        <p className="opacity-90">{error}</p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg bg-background/60 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
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
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-foreground"
                          >
                            <MessageCircle className="h-3 w-3" /> Essayer SMS
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setMode("email"); setError(null); setShowWhatsAppFallback(false); }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
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
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366] bg-background px-3 py-1.5 text-[11px] font-semibold text-[#25D366]"
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
                  className="shine-sweep relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,0.7)] transition-transform active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]"
                  style={{
                    background: "linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #ea580c 100%)",
                  }}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SE CONNECTER"}
                </button>

                <div className="mt-5 flex flex-col items-center gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => { if (identifierLabel && (phone || email)) setStep("otp"); }}
                    className="text-sm text-white/70 transition hover:text-amber-300 focus:outline-none focus-visible:underline"
                  >
                    Vérifier le code ?
                  </button>
                  <a
                    href="https://wa.me/237699999999?text=Bonjour%20MboaEats%2C%20j%27ai%20besoin%20d%27aide%20pour%20me%20connecter."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 transition hover:text-amber-300 focus:outline-none focus-visible:underline"
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_30px_rgba(251,146,60,0.5)]">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">Vérification</h2>
                <p className="mt-1 text-sm text-white/60">
                  {channel === "whatsapp" ? "Code envoyé par WhatsApp" : channel === "email" ? "Code envoyé par email" : "Code envoyé par SMS"} à
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-300">{identifierLabel}</p>
              </div>

              <div>
                <label className="mb-3 block text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                  Saisissez les 6 chiffres
                </label>
                <OtpInput value={code} onChange={setCode} onComplete={() => {
                  // submit when 6 digits entered
                  const form = document.getElementById("otp-form") as HTMLFormElement | null;
                  form?.requestSubmit();
                }} />
                <input id="otp-form-hidden" type="hidden" />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="shine-sweep relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_30px_-10px_rgba(249,115,22,0.7)] transition-transform active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]"
                style={{
                  background: "linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #ea580c 100%)",
                }}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (<><Check className="h-4 w-4" /> Valider</>)}
              </button>

              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resendCount >= MAX_RESEND || loading}
                  className="text-sm font-semibold text-amber-300 transition hover:text-amber-200 disabled:text-white/40 disabled:cursor-not-allowed focus:outline-none focus-visible:underline"
                >
                  {resendCount >= MAX_RESEND
                    ? "Limite de renvois atteinte"
                    : cooldown > 0
                      ? `Renvoyer le code dans ${cooldown}s`
                      : "Renvoyer le code"}
                </button>
                <p className="text-[11px] text-white/40">
                  {resendCount}/{MAX_RESEND} tentatives utilisées
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep("identify"); setCode(""); setError(null); setResendCount(0); setCooldown(0); }}
                className="block w-full text-center text-xs text-white/60 underline-offset-4 hover:text-white hover:underline focus:outline-none focus-visible:underline"
              >
                ← Modifier {mode === "phone" ? "le numéro" : "l'email"}
              </button>
            </form>
          )}
        </div>

        {/* Lien admin retiré de l'interface publique. Accès via /admin/login uniquement. */}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-xs text-white/60 backdrop-blur-xl">
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

        <p className="mt-4 text-center text-[11px] text-white/55">
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
