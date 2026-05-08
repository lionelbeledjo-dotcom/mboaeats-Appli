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
    <div className="relative min-h-screen overflow-hidden bg-[#07080a] text-white" style={{ colorScheme: "dark" }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[446px] bg-[#1a1007]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[446px]"
        style={{
          background:
            "radial-gradient(circle at 50% 10%, rgba(255,143,18,0.26), transparent 34%), radial-gradient(circle at 85% 20%, rgba(255,128,0,0.18), transparent 38%), linear-gradient(180deg, #221609 0%, #120d09 100%)",
        }}
      />
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 h-[446px] w-full"
        viewBox="0 0 1296 446"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-34 91C159 45 389 41 562 91C742 143 871 245 1040 240C1145 237 1235 196 1324 129" stroke="#b16f0c" strokeWidth="3" opacity="0.62" />
        <path d="M-18 235C193 178 423 166 609 223C776 274 868 394 1035 426C1133 445 1228 435 1323 410" stroke="#f0a20b" strokeWidth="4" opacity="0.85" />
        <path d="M-34 407C139 357 305 342 472 352C713 366 846 463 1030 464C1164 465 1241 424 1329 351" stroke="#c0770c" strokeWidth="3" opacity="0.72" />
        <circle cx="177" cy="160" r="157" stroke="#c89213" strokeWidth="3" opacity="0.55" />
        <circle cx="1007" cy="225" r="172" stroke="#d89416" strokeWidth="4" opacity="0.76" />
        <circle cx="1210" cy="222" r="376" stroke="#d98f18" strokeWidth="4" opacity="0.7" />
        <path d="M-20 84C167 37 362 46 527 86C714 132 833 225 1027 239C1136 247 1232 219 1324 166" stroke="#c06f0c" strokeWidth="2" opacity="0.55" />
      </svg>

      <div className="absolute right-[7.6%] top-4 z-10 flex items-start gap-[-4px]">
        <button type="button" aria-label="Aide" className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#ff7308] text-2xl font-black text-white shadow-[0_12px_30px_rgba(255,112,8,0.35)] ring-1 ring-orange-300/20">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white text-[15px] leading-none">?</span>
        </button>
        <span className="-ml-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 ring-[3px] ring-white" aria-hidden />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-[548px] flex-col px-6 pt-[46px]">
        <div className="mb-[28px] flex flex-col items-center text-center">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-[31px] bg-gradient-to-br from-[#ffa414] via-[#ff850c] to-[#ff5b05] shadow-[0_0_58px_rgba(255,128,10,0.42)]">
            <div className="absolute inset-[-28px] -z-10 rounded-full bg-[#ff8908]/20 blur-3xl" aria-hidden />
            <Flame className="h-10 w-10 text-white" strokeWidth={2.35} />
          </div>
          <h1 className="font-display text-[38px] font-black leading-none text-white drop-shadow-sm">MboaEats</h1>
          <p className="mt-4 text-[17px] font-light leading-none text-white/66">
            Veuillez vous connecter pour continuer
          </p>
        </div>

        <div className="rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(74,56,30,0.94)_0%,rgba(25,25,27,0.98)_42%,rgba(18,18,20,1)_100%)] p-[30px] shadow-[0_34px_90px_-28px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl animate-fade-up">
          {step === "identify" && (
            <>
              {/* Mode tabs */}
              <div className="mb-7 grid h-[52px] grid-cols-2 gap-2 rounded-full border border-[#806d49]/55 bg-[#625238]/85 p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                <button
                  type="button"
                  onClick={() => { setMode("phone"); setError(null); }}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 text-[14px] font-extrabold transition ${mode === "phone" ? "bg-[#756b58] text-white shadow-[inset_0_0_0_1.5px_rgba(215,169,83,0.72)]" : "text-white/48 hover:text-white/75"}`}
                >
                  <Phone className="h-3.5 w-3.5" /> Téléphone
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("email"); setError(null); }}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 text-[14px] font-extrabold transition ${mode === "email" ? "bg-[#756b58] text-white shadow-[inset_0_0_0_1.5px_rgba(215,169,83,0.72)]" : "text-white/48 hover:text-white/75"}`}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
              </div>

              <form onSubmit={submitIdentify} className="space-y-[26px]">
                {mode === "phone" ? (
                  <>
                    <label className="block text-[13px] font-black uppercase tracking-[0.34em] text-white/56">
                      Numéro de téléphone
                    </label>
                    {/* Glassmorphism block — copper border + gold separator */}
                    <div className="group relative flex h-[68px] items-stretch overflow-hidden rounded-[28px] border border-[#d89109] bg-[#2a2a2e]/95 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(255,166,0,0.05),0_16px_48px_-26px_rgba(255,148,18,0.72)] transition focus-within:border-[#ffb000] focus-within:ring-[3px] focus-within:ring-[#ff9d00]/34">
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
                        className="flex shrink-0 items-center gap-3 px-[20px] text-sm font-semibold text-white transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb000] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113] rounded-l-[28px]"
                      >
                        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#5f5f65] text-[14px] font-black leading-none ring-1 ring-white/10">
                          {country.flag}
                        </span>
                        <span className="font-display text-[21px] font-black tracking-wide">{country.dial}</span>
                        <ChevronDown className={`h-4 w-4 text-[#ffad05] transition-transform ${showCountries ? "rotate-180" : ""}`} strokeWidth={3} />
                      </button>
                      <span
                        aria-hidden
                        className="my-[14px] w-px bg-gradient-to-b from-transparent via-white/18 to-transparent"
                      />
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="Entrez votre numéro de téléphone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-5 text-[20px] font-semibold text-white outline-none placeholder:text-white/36 focus-visible:ring-2 focus-visible:ring-[#ffb000]/70 rounded-r-[28px]"
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
                    <label className="block text-[13px] font-black uppercase tracking-[0.34em] text-white/56">
                      Adresse email
                    </label>
                    <div className="flex h-[68px] items-center gap-3 rounded-[28px] border border-[#d89109] bg-[#2a2a2e]/95 px-5 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_48px_-26px_rgba(255,148,18,0.72)] transition focus-within:border-[#ffb000] focus-within:ring-[3px] focus-within:ring-[#ff9d00]/34">
                      <Mail className="h-5 w-5 text-[#ffad05]" />
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="vous@exemple.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold text-white outline-none placeholder:text-white/36"
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
                    <p className="mb-3 text-[13px] font-black uppercase tracking-[0.2em] text-white/36">
                      Recevoir le code par
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setChannel("sms"); setError(null); setShowWhatsAppFallback(false); }}
                        className={`flex h-[72px] items-center justify-center gap-2 rounded-[28px] border text-[20px] font-semibold transition ${channel === "sms" ? "border-[#ff5b05] bg-[#3a1e18] text-[#17120f] shadow-[inset_0_0_0_1px_rgba(255,102,0,0.2)]" : "border-white/12 bg-white/[0.04] text-white/45 hover:bg-white/[0.07]"}`}
                      >
                        <MessageCircle className="h-4 w-4" /> SMS
                      </button>
                      {whatsappAvailable ? (
                        <button
                          type="button"
                          onClick={() => { setChannel("whatsapp"); setError(null); setShowWhatsAppFallback(false); }}
                          className={`flex h-[72px] items-center justify-center gap-2 rounded-[28px] border text-[20px] font-semibold transition ${channel === "whatsapp" ? "border-[#ff5b05] bg-[#3a1e18] text-white" : "border-white/12 bg-white/[0.04] text-white/45 hover:bg-white/[0.07]"}`}
                        >
                          <Send className="h-4 w-4" /> WhatsApp
                        </button>
                      ) : (
                        <div
                          className="flex h-[72px] flex-col items-center justify-center gap-0.5 rounded-[28px] border border-dashed border-white/50 bg-white/[0.2] text-center text-[13px] font-bold text-white/28"
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

                <p className="flex items-start gap-3 text-[13px] leading-snug text-white/32">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5b05]" />
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
                  className="shine-sweep relative inline-flex h-[60px] w-full items-center justify-center gap-2 overflow-hidden rounded-[24px] text-[17px] font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_34px_-18px_rgba(255,104,5,0.95)] transition-transform active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113]"
                  style={{
                    background: "linear-gradient(90deg, #ffd28a 0%, #ff8b13 36%, #ff6908 68%, #f45b06 100%)",
                  }}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SE CONNECTER"}
                </button>

                <div className="mt-9 flex flex-col items-center gap-4 text-center">
                  <button
                    type="button"
                    onClick={() => { if (identifierLabel && (phone || email)) setStep("otp"); }}
                    className="text-[16px] font-medium text-white/58 transition hover:text-amber-300 focus:outline-none focus-visible:underline"
                  >
                    Vérifier le code ?
                  </button>
                  <a
                    href="https://wa.me/237699999999?text=Bonjour%20MboaEats%2C%20j%27ai%20besoin%20d%27aide%20pour%20me%20connecter."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[16px] font-medium text-white/58 transition hover:text-amber-300 focus:outline-none focus-visible:underline"
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

        <div className="sr-only mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-xs text-white/60 backdrop-blur-xl">
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

        <p className="sr-only mt-4 text-center text-[11px] text-white/55">
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
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  const setDigit = (i: number, d: string) => {
    const sanitized = d.replace(/\D/g, "");
    if (!sanitized) return;
    const chars = (value + "").split("");
    chars[i] = sanitized[0];
    const next = chars.join("").slice(0, length);
    onChange(next);
    if (i < length - 1) focusIndex(i + 1);
    if (next.length === length) onComplete?.(next);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, i: number) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!txt) return;
    e.preventDefault();
    const next = (value.slice(0, i) + txt).slice(0, length);
    onChange(next);
    focusIndex(Math.min(length - 1, i + txt.length));
    if (next.length === length) onComplete?.(next);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = value.split("");
      if (chars[i]) {
        chars[i] = "";
        onChange(chars.join(""));
      } else if (i > 0) {
        chars[i - 1] = "";
        onChange(chars.join(""));
        focusIndex(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusIndex(i + 1);
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
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={(e) => handlePaste(e, i)}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Chiffre ${i + 1}`}
          className="h-14 w-11 sm:w-12 rounded-xl border border-[#f59e0b]/60 bg-[#1a1a1d] text-center text-2xl font-bold text-white outline-none transition focus:border-[#fbbf24] focus:ring-2 focus:ring-amber-400/40 focus-visible:ring-2 focus-visible:ring-amber-400"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
