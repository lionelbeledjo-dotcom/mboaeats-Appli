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
  const [showWhatsAppFallback, setShowWhatsAppFallback] = useState(false);

  useEffect(() => {
    let active = true;
    getDeliveryConfigFn()
      .then((cfg: any) => {
        if (!active) return;
        if (cfg?.twilioTrial) {
          setSmsTrial(true);
          setChannel("whatsapp");
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
    setStep("channel");
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
      } else {
        setError("Ce canal n'est pas encore disponible. Choisissez SMS ou WhatsApp.");
      }
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
        // Ouvre une vraie session Supabase Auth pour que les endpoints protégés fonctionnent
        if (res?.auth?.token_hash) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { error: vErr } = await supabase.auth.verifyOtp({
            type: "magiclink",
            token_hash: res.auth.token_hash,
          });
          if (vErr) throw new Error(vErr.message);
        }
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-gold/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Flame className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Bienvenue au Mboa</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Connectez-vous pour commander
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-card backdrop-blur-xl animate-fade-up">
          {step === "identify" && (
            <>
              {/* Mode tabs */}
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => { setMode("phone"); setError(null); }}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${mode === "phone" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
                >
                  <Phone className="h-3.5 w-3.5" /> Téléphone
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("email"); setError(null); }}
                  className={`flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${mode === "email" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground"}`}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
              </div>

              <form onSubmit={submitIdentify} className="space-y-5">
                {mode === "phone" ? (
                  <>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Numéro de téléphone
                    </label>
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
                        placeholder="6 12 34 56 78"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>

                    {showCountries && (
                      <div className="rounded-2xl border border-border bg-background p-2">
                        <input
                          type="text"
                          placeholder="Rechercher un pays ou indicatif…"
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
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
                              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/60 ${c.code === countryCode ? "bg-muted/40" : ""}`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-base leading-none">{c.flag}</span>
                                <span>{c.name}</span>
                              </span>
                              <span className="text-xs text-muted-foreground">{c.dial}</span>
                            </button>
                          ))}
                          {filteredCountries.length === 0 && (
                            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Aucun pays trouvé</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Adresse email
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-1.5 focus-within:border-primary">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="vous@exemple.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>
                  </>
                )}

                {mode === "phone" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recevoir le code par
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setChannel("sms"); setError(null); }}
                        className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition ${channel === "sms" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted/40"}`}
                      >
                        <MessageCircle className="h-4 w-4" /> SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => { setChannel("whatsapp"); setError(null); }}
                        className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition ${channel === "whatsapp" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted/40"}`}
                      >
                        <Send className="h-4 w-4" /> WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                <p className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Un code à 6 chiffres vous sera envoyé par {mode === "phone" ? (channel === "whatsapp" ? "WhatsApp" : "SMS") : "email"} pour confirmer votre identité.
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
                  onClick={sendCode}
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
                {channel === "whatsapp" ? "💬 Code envoyé par WhatsApp" : "📩 Code envoyé par SMS"} au <span className="font-semibold">{identifierLabel}</span>. Saisissez les 6 chiffres reçus.
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

              <button
                type="button"
                onClick={() => { setStep("identify"); setCode(""); setError(null); }}
                className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Modifier {mode === "phone" ? "le numéro" : "l'email"}
              </button>
            </form>
          )}
        </div>

        {/* Lien admin retiré de l'interface publique. Accès via /admin/login uniquement. */}

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
