import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Créer un compte — MboaEats" },
      { name: "description", content: "Rejoignez MboaEats : créez votre compte pour commander vos plats camerounais préférés." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: InscriptionPage,
});

const COUNTRIES = [
  { code: "CM", iso: "cm", dial: "+237", name: "Cameroun" },
  { code: "FR", iso: "fr", dial: "+33", name: "France" },
  { code: "BE", iso: "be", dial: "+32", name: "Belgique" },
  { code: "CH", iso: "ch", dial: "+41", name: "Suisse" },
  { code: "CA", iso: "ca", dial: "+1", name: "Canada" },
  { code: "GB", iso: "gb", dial: "+44", name: "Royaume-Uni" },
  { code: "DE", iso: "de", dial: "+49", name: "Allemagne" },
  { code: "ES", iso: "es", dial: "+34", name: "Espagne" },
  { code: "IT", iso: "it", dial: "+39", name: "Italie" },
  { code: "SN", iso: "sn", dial: "+221", name: "Sénégal" },
  { code: "CI", iso: "ci", dial: "+225", name: "Côte d'Ivoire" },
  { code: "MA", iso: "ma", dial: "+212", name: "Maroc" },
];

function FlagCircle({ iso, alt, size = 22 }: { iso: string; alt: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-neutral-200"
      style={{ width: size, height: size }}
    >
      <img
        src={`https://hatscripts.github.io/circle-flags/flags/${iso}.svg`}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

const nameSchema = z.string().trim().min(2, "Nom trop court").max(100);
const emailSchema = z.string().trim().email("Email invalide").max(255);
const phoneDigitsSchema = z.string().regex(/^[0-9]{6,15}$/, "Numéro invalide");
const passwordSchema = z
  .string()
  .min(8, "Minimum 8 caractères")
  .regex(/[A-Z]/, "Doit contenir une majuscule")
  .regex(/[0-9]/, "Doit contenir un chiffre");

function InscriptionPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("CM");
  const [phone, setPhone] = useState("");
  const [showCountries, setShowCountries] = useState(false);
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0],
    [countryCode],
  );
  const fullPhone = `${country.dial}${phone.replace(/\D/g, "")}`;

  useEffect(() => {
    if (!showCountries) return;
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setShowCountries(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showCountries]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = nameSchema.safeParse(name);
    if (!n.success) return setErr(n.error.issues[0].message);
    const em = emailSchema.safeParse(email);
    if (!em.success) return setErr(em.error.issues[0].message);
    const ph = phoneDigitsSchema.safeParse(phone.replace(/\D/g, ""));
    if (!ph.success) return setErr(ph.error.issues[0].message);
    const p = passwordSchema.safeParse(pwd);
    if (!p.success) return setErr(p.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: em.data,
      password: p.data,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: n.data, phone: fullPhone },
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
    setSignUpSuccess(true);
  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-8">
          <div className="w-full rounded-2xl border border-neutral-100 bg-white p-6 sm:p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#06C167]/10">
              <CheckCircle2 className="h-9 w-9 text-[#06C167]" strokeWidth={2} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-black">Compte créé avec succès !</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Un email de confirmation a été envoyé à :
            </p>
            <p className="mt-1 font-semibold text-black">{email}</p>

            <div className="mt-5 rounded-xl bg-blue-50 p-4 text-left">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold">Vérifiez votre boîte de réception</p>
                  <p className="mt-1">
                    Cliquez sur le lien dans l'email pour activer votre compte.
                    Pensez à vérifier vos spams si vous ne le trouvez pas.
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/connexion"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C167] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_8px_24px_-12px_rgba(6,193,103,0.7)] transition-all hover:bg-[#05A659] active:scale-[0.99]"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <Link
          to="/connexion"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          <span>Connexion</span>
        </Link>

        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">Créer un compte</h1>
          <p className="mt-2 text-sm text-neutral-600">Rejoins MboaEats en moins d'une minute.</p>
        </div>

        <GoogleSignInButton label="S'inscrire avec Google" />

        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">ou par email</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <FieldRow icon={UserIcon}>
            <input
              type="text" autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Nom complet"
              className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-neutral-400 focus:outline-none"
            />
          </FieldRow>
          <FieldRow icon={Mail}>
            <input
              type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com"
              className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-neutral-400 focus:outline-none"
            />
          </FieldRow>

          {/* Téléphone : sélecteur de pays + numéro */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-stretch gap-2 rounded-2xl border-2 border-neutral-200 bg-white p-1.5 transition-all focus-within:border-[#06C167] focus-within:ring-2 focus-within:ring-[#06C167]/20">
              <button
                type="button"
                onClick={() => setShowCountries((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]"
                aria-haspopup="listbox"
                aria-expanded={showCountries}
                aria-label={`Pays sélectionné : ${country.name}`}
              >
                <FlagCircle iso={country.iso} alt={country.name} />
                <span>{country.dial}</span>
                <ChevronDown
                  className={`h-4 w-4 text-neutral-500 transition-transform ${showCountries ? "rotate-180" : ""}`}
                  strokeWidth={2.5}
                />
              </button>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="6 XX XX XX XX"
                className="flex-1 bg-transparent px-2 text-base font-semibold text-black placeholder:text-neutral-400 focus:outline-none"
              />
            </div>

            {showCountries && (
              <ul
                role="listbox"
                className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]"
              >
                {COUNTRIES.map((c) => {
                  const active = c.code === countryCode;
                  return (
                    <li key={c.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setCountryCode(c.code);
                          setShowCountries(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-[#F6F6F6] ${
                          active ? "bg-[#F6F6F6] font-semibold text-black" : "text-neutral-800"
                        }`}
                      >
                        <FlagCircle iso={c.iso} alt={c.name} />
                        <span className="flex-1">{c.name}</span>
                        <span className="font-mono text-xs text-neutral-500">{c.dial}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <FieldRow icon={Lock}>
            <input
              type={showPwd ? "text" : "password"} autoComplete="new-password" value={pwd}
              onChange={(e) => setPwd(e.target.value)} placeholder="Mot de passe (8+ avec maj. & chiffre)"
              className="flex-1 bg-transparent text-base font-medium text-black placeholder:text-neutral-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="rounded-lg p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]"
              aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </FieldRow>

          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C167] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_8px_24px_-12px_rgba(6,193,103,0.7)] transition-all hover:bg-[#05A659] active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Créer mon compte
            {!busy && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          Déjà inscrit ?{" "}
          <Link to="/connexion" className="font-bold text-[#06C167] hover:underline underline-offset-4">
            Se connecter
          </Link>
        </p>

        <p className="mt-auto pt-8 text-center text-xs text-neutral-500">
          En continuant tu acceptes nos{" "}
          <Link to="/cgu" className="font-medium text-neutral-700 underline underline-offset-2 hover:text-black">CGU</Link>{" "}
          et notre{" "}
          <Link to="/confidentialite" className="font-medium text-neutral-700 underline underline-offset-2 hover:text-black">politique de confidentialité</Link>.
        </p>
      </div>
    </div>
  );
}

function FieldRow({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border-2 border-neutral-200 bg-white px-4 py-3 transition-all focus-within:border-[#06C167] focus-within:ring-2 focus-within:ring-[#06C167]/20">
      <Icon className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2} />
      {children}
    </label>
  );
}
