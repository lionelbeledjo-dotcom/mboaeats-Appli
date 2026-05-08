import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, User as UserIcon, Phone, ArrowLeft, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import QuickLogin from "@/components/QuickLogin";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
  head: () => ({
    meta: [
      { title: "Connexion · MboaEats" },
      { name: "description", content: "Connectez-vous ou créez votre compte MboaEats." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Tab = "login" | "signup" | "phone";

const emailSchema = z.string().trim().email("Email invalide").max(255);
const passwordSchema = z
  .string()
  .min(8, "Minimum 8 caractères")
  .regex(/[A-Z]/, "Doit contenir une majuscule")
  .regex(/[0-9]/, "Doit contenir un chiffre");
const nameSchema = z.string().trim().min(2, "Nom trop court").max(100);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{8,20}$/, "Numéro invalide");

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.5 34.6 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.5 5.5C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function Connexion() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("login");

  // Redirect when authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate({ to: "/profil" });
  }, [authLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          <span>Accueil</span>
        </Link>

        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            {tab === "signup" ? "Créer un compte" : "Bon retour"}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {tab === "signup"
              ? "Rejoins MboaEats en moins d'une minute."
              : "Retrouve tes restos et commandes préférés."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-5 inline-flex rounded-full bg-neutral-100 p-1">
          {(["login", "signup", "phone"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                tab === t ? "bg-black text-white shadow-sm" : "text-neutral-600 hover:text-black"
              }`}
            >
              {t === "login" ? "Se connecter" : t === "signup" ? "S'inscrire" : "Téléphone"}
            </button>
          ))}
        </div>

        {tab === "login" && <LoginForm onSuccess={() => navigate({ to: "/profil" })} />}
        {tab === "signup" && <SignupForm onVerified={() => navigate({ to: "/profil" })} />}
        {tab === "phone" && <QuickLogin />}

        {tab !== "phone" && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              <span>ou</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>
            <GoogleButton />
          </>
        )}

        <p className="mt-auto pt-8 text-center text-xs text-neutral-500">
          En continuant tu acceptes nos{" "}
          <Link to="/cgu" className="font-medium text-neutral-700 underline underline-offset-2 hover:text-black">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link to="/confidentialite" className="font-medium text-neutral-700 underline underline-offset-2 hover:text-black">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/* ---------- Login (email + password) ---------- */
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const eRes = emailSchema.safeParse(email);
    if (!eRes.success) return setErr(eRes.error.issues[0].message);
    if (!pwd) return setErr("Mot de passe requis");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: eRes.data, password: pwd });
    setBusy(false);
    if (error) {
      setErr(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : error.message === "Email not confirmed"
            ? "Email non confirmé. Vérifie ta boîte de réception."
            : error.message,
      );
      return;
    }
    toast.success("Connexion réussie");
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="ton@email.com"
        value={email}
        onChange={setEmail}
      />
      <Field
        icon={Lock}
        type={showPwd ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Mot de passe"
        value={pwd}
        onChange={setPwd}
        rightAction={
          <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-neutral-500" aria-label="Afficher">
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
      <div className="flex justify-end pt-1">
        <Link to="/reset-password" className="text-xs font-medium text-neutral-600 hover:text-black">
          Mot de passe oublié ?
        </Link>
      </div>
      {err && <ErrorBox>{err}</ErrorBox>}
      <PrimaryButton busy={busy}>Se connecter</PrimaryButton>
    </form>
  );
}

function ResetPasswordLink({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="flex justify-end pt-1">
      {sent ? (
        <span className="text-xs text-emerald-600">Lien envoyé ✓</span>
      ) : (
        <button
          type="button"
          onClick={async () => {
            const r = emailSchema.safeParse(email);
            if (!r.success) return;
            await supabase.auth.resetPasswordForEmail(r.data, {
              redirectTo: `${window.location.origin}/connexion`,
            });
            setSent(true);
          }}
          className="text-xs font-medium text-neutral-600 hover:text-black"
        >
          Mot de passe oublié ?
        </button>
      )}
    </div>
  );
}

/* ---------- Signup (name + email + phone + password) ---------- */
function SignupForm({ onVerified }: { onVerified: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [otp, setOtp] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = nameSchema.safeParse(name);
    if (!n.success) return setErr(n.error.issues[0].message);
    const em = emailSchema.safeParse(email);
    if (!em.success) return setErr(em.error.issues[0].message);
    const ph = phoneSchema.safeParse(phone);
    if (!ph.success) return setErr(ph.error.issues[0].message);
    const p = passwordSchema.safeParse(pwd);
    if (!p.success) return setErr(p.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: em.data,
      password: p.data,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: n.data, phone: ph.data },
      },
    });
    setBusy(false);
    if (error) {
      setErr(
        error.message === "User already registered"
          ? "Un compte existe déjà pour cet email"
          : error.message,
      );
      return;
    }
    setStep("verify");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (otp.length !== 6) return setErr("Code à 6 chiffres requis");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "signup" });
    setBusy(false);
    if (error) return setErr(error.message);
    onVerified();
  }

  if (step === "verify") {
    return (
      <form onSubmit={verify} className="space-y-3">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-black">Vérifie ton email</p>
          <p className="mt-1 text-xs text-neutral-600">
            On a envoyé un code à <span className="font-semibold text-black">{email}</span>. Saisis-le ci-dessous.
          </p>
        </div>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center font-mono text-xl tracking-[0.5em] text-black placeholder:text-neutral-300 focus:border-black focus:outline-none"
        />
        {err && <ErrorBox>{err}</ErrorBox>}
        <PrimaryButton busy={busy}>Confirmer</PrimaryButton>
        <button
          type="button"
          onClick={() => setStep("form")}
          className="w-full text-center text-xs font-medium text-neutral-600 hover:text-black"
        >
          ← Modifier mes informations
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field icon={UserIcon} type="text" autoComplete="name" placeholder="Nom complet" value={name} onChange={setName} />
      <Field icon={Mail} type="email" autoComplete="email" placeholder="Email" value={email} onChange={setEmail} />
      <Field icon={Phone} type="tel" autoComplete="tel" placeholder="+237 6XX XXX XXX" value={phone} onChange={setPhone} />
      <Field
        icon={Lock}
        type={showPwd ? "text" : "password"}
        autoComplete="new-password"
        placeholder="Mot de passe (8+ avec maj. & chiffre)"
        value={pwd}
        onChange={setPwd}
        rightAction={
          <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-neutral-500" aria-label="Afficher">
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
      {err && <ErrorBox>{err}</ErrorBox>}
      <PrimaryButton busy={busy}>Créer mon compte</PrimaryButton>
    </form>
  );
}

/* ---------- Phone OTP (legacy Twilio flow, kept) ---------- */
function PhoneForm({ onSuccess }: { onSuccess: () => void }) {
  const sendFn = useServerFn(sendOtp);
  const verifyFn = useServerFn(verifyOtp);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const ph = phoneSchema.safeParse(phone);
    if (!ph.success) return setErr(ph.error.issues[0].message);
    setBusy(true);
    try {
      const res = await sendFn({ data: { phone: ph.data, channel: "sms" } });
      if ((res as { ok?: boolean }).ok === false) {
        setErr((res as { error?: string }).error ?? "Erreur d'envoi");
      } else {
        setStep("code");
        const dev = (res as { devCode?: string }).devCode;
        if (dev) setCode(dev);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setBusy(false);
    }
  }
  async function check(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (code.length !== 6) return setErr("Code à 6 chiffres requis");
    setBusy(true);
    try {
      const res = await verifyFn({ data: { phone, code } });
      if ((res as { ok?: boolean }).ok === false) setErr("Code incorrect");
      else onSuccess();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={step === "phone" ? send : check} className="space-y-3">
      {step === "phone" ? (
        <Field icon={Phone} type="tel" placeholder="+237 6XX XXX XXX" value={phone} onChange={setPhone} autoComplete="tel" />
      ) : (
        <>
          <p className="text-xs text-neutral-600">
            Code SMS envoyé à <span className="font-semibold text-black">{phone}</span>
          </p>
          <input
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center font-mono text-xl tracking-[0.5em] text-black placeholder:text-neutral-300 focus:border-black focus:outline-none"
            placeholder="123456"
          />
        </>
      )}
      {err && <ErrorBox>{err}</ErrorBox>}
      <PrimaryButton busy={busy}>{step === "phone" ? "Recevoir le code" : "Vérifier"}</PrimaryButton>
      {step === "code" && (
        <button type="button" onClick={() => setStep("phone")} className="w-full text-center text-xs text-neutral-600 hover:text-black">
          ← Modifier le numéro
        </button>
      )}
    </form>
  );
}

/* ---------- Google ---------- */
function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
          if ((r as { error?: unknown }).error) {
            setErr("Connexion Google indisponible");
            setBusy(false);
          }
        }}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
        Continuer avec Google
      </button>
      {err && <p className="mt-2 text-center text-xs text-red-600">{err}</p>}
    </>
  );
}

/* ---------- Atomic UI ---------- */
function Field({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  rightAction,
}: {
  icon: typeof Mail;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-all focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
      <Icon className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2} />
      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
      />
      {rightAction}
    </label>
  );
}

function PrimaryButton({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
      {!busy && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
    </button>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
