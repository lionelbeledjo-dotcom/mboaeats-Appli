import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
    <div className="relative min-h-screen overflow-hidden bg-[#0c0a14] text-white">
      {/* Radiant atmosphere — deep charcoal + violet/orange/brick glows */}
      <div className="pointer-events-none absolute inset-0">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 30%, rgba(255,90,40,0.28), transparent 65%), radial-gradient(45% 40% at 20% 80%, rgba(120,40,200,0.32), transparent 70%), radial-gradient(50% 45% at 85% 75%, rgba(180,30,40,0.28), transparent 70%), linear-gradient(180deg, #0e0a1a 0%, #0a0610 100%)",
          }}
        />
        <div className="absolute -top-32 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-[#ff6a3d]/20 blur-[160px] animate-radiant-a" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[460px] w-[460px] rounded-full bg-[#7a2cff]/25 blur-[180px] animate-radiant-b" />
        <div className="absolute top-1/3 -left-32 h-[420px] w-[420px] rounded-full bg-[#c41a2a]/20 blur-[160px] animate-radiant-a" />
        {/* Subtle grain */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        {/* Brand — logo with radiant glow */}
        <div className="mb-10 flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-3xl blur-2xl opacity-80"
              style={{
                background:
                  "conic-gradient(from 120deg, #ff6a3d, #c41a2a, #7a2cff, #ff6a3d)",
              }}
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0c0a14]/70 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_8px_40px_-8px_rgba(255,106,61,0.55)]">
              <Flame className="h-8 w-8 text-[#ffb38a]" strokeWidth={2} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Bienvenue au Mboa</h1>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/55">
              Connectez-vous pour commander
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
                    <div className="group relative flex items-stretch overflow-hidden rounded-2xl border border-[#d4af6c]/45 bg-white/[0.06] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_40px_-20px_rgba(212,175,108,0.4)] focus-within:border-[#d4af6c]/80">
                      <button
                        type="button"
                        onClick={() => setShowCountries((v) => !v)}
                        aria-label="Choisir le pays"
                        className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                      >
                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/10 text-base leading-none ring-1 ring-white/15">
                          {country.flag}
                        </span>
                        <span className="font-display text-base font-bold tracking-wide">{country.dial}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-[#d4af6c]" strokeWidth={2.4} />
                      </button>
                      <span
                        aria-hidden
                        className="my-3 w-px bg-gradient-to-b from-transparent via-[#d4af6c]/70 to-transparent"
                      />
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="Entrez votre numéro de téléphone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-white/40"
                        autoFocus
                      />
                    </div>

                    {showCountries && (
                      <div className="rounded-2xl border border-white/10 bg-[#0c0a14]/90 p-2 backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
                        <input
                          type="text"
                          placeholder="Rechercher un pays ou indicatif…"
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#d4af6c]/70"
                        />
                        <div className="max-h-56 overflow-y-auto">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setCountryCode(c.code);
                                setShowCountries(false);
                                setCountryQuery("");
                              }}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 ${c.code === countryCode ? "bg-white/10" : ""}`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/10 text-base leading-none ring-1 ring-white/15">{c.flag}</span>
                                <span>{c.name}</span>
                              </span>
                              <span className="text-xs text-white/55">{c.dial}</span>
                            </button>
                          ))}
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
                    <div className="flex items-center gap-2 rounded-2xl border border-[#d4af6c]/45 bg-white/[0.06] backdrop-blur-2xl px-3 py-1.5 focus-within:border-[#d4af6c]/80">
                      <Mail className="h-4 w-4 text-[#d4af6c]" />
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
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "phone" ? "Envoyer le code" : "Continuer")}
                </button>

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
            <form onSubmit={submitCode} className="space-y-4 animate-fade-up">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs">
                {channel === "whatsapp" ? "💬 Code envoyé par WhatsApp" : channel === "email" ? "📧 Vérifiez votre boîte email ! Le code expire dans 30 min." : "📩 Code envoyé par SMS"} {channel === "email" ? "à" : "à"} <span className="font-semibold">{identifierLabel}</span>. Saisissez les 6 chiffres reçus.
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Code de vérification
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary"
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
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Check className="h-4 w-4" /> Valider et entrer</>)}
              </button>

              <div className="flex flex-col items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resendCount >= MAX_RESEND || loading}
                  className="text-xs font-semibold text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline underline-offset-4"
                >
                  {resendCount >= MAX_RESEND
                    ? "Limite de renvois atteinte"
                    : cooldown > 0
                      ? `Renvoyer le code dans ${cooldown}s`
                      : "Renvoyer le code"}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  {resendCount}/{MAX_RESEND} tentatives utilisées
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep("identify"); setCode(""); setError(null); setResendCount(0); setCooldown(0); }}
                className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Modifier {mode === "phone" ? "le numéro" : "l'email"}
              </button>
            </form>
          )}
        </div>

        {/* Lien admin retiré de l'interface publique. Accès via /admin/login uniquement. */}

        <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4 text-center text-xs text-muted-foreground backdrop-blur">
          <p className="mb-2 font-semibold text-foreground">Vous ne recevez pas de code ?</p>
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

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Support : <a className="text-primary hover:underline" href="mailto:lionelbrown2728@yahoo.fr">lionelbrown2728@yahoo.fr</a>
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
