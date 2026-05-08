import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Mail, Lock, Phone, User as UserIcon, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const nameSchema = z.string().trim().min(2, "Nom trop court").max(100);
const emailSchema = z.string().trim().email("Email invalide").max(255);
const phoneSchema = z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/, "Numéro invalide");
const passwordSchema = z
  .string()
  .min(8, "Minimum 8 caractères")
  .regex(/[A-Z]/, "Doit contenir une majuscule")
  .regex(/[0-9]/, "Doit contenir un chiffre");

function InscriptionPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        emailRedirectTo: `${window.location.origin}/accueil`,
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
    toast.success("Compte créé. Vérifie ton email pour confirmer.");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          <span>Connexion</span>
        </Link>

        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">Créer un compte</h1>
          <p className="mt-2 text-sm text-neutral-600">Rejoins MboaEats en moins d'une minute.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <FieldRow icon={UserIcon}>
            <input
              type="text" autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Nom complet"
              className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
            />
          </FieldRow>
          <FieldRow icon={Mail}>
            <input
              type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com"
              className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
            />
          </FieldRow>
          <FieldRow icon={Phone}>
            <input
              type="tel" autoComplete="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX"
              className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
            />
          </FieldRow>
          <FieldRow icon={Lock}>
            <input
              type={showPwd ? "text" : "password"} autoComplete="new-password" value={pwd}
              onChange={(e) => setPwd(e.target.value)} placeholder="Mot de passe (8+ avec maj. & chiffre)"
              className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
            />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-neutral-500" aria-label="Afficher">
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
          <Link to="/" className="font-bold text-[#06C167] hover:underline underline-offset-4">
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
    <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-all focus-within:border-[#06C167] focus-within:ring-2 focus-within:ring-[#06C167]/20">
      <Icon className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={2} />
      {children}
    </label>
  );
}
