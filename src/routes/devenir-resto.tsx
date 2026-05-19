import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Store,
  TrendingUp,
  Users,
  Star,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Utensils,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  ChefHat,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createMyRestaurant, getMyRestaurant } from "@/server/restaurant.functions";

/**
 * Devenir Restaurateur — Parcours d'inscription complet (Étape 2 — Pack 2).
 *
 * REFONTE COMPLÈTE vs ancien fichier :
 *
 *   AVANT (ancien) : formulaire fantôme. Aucun appel API. `setDone(true)`
 *   à la fin n'enregistrait RIEN. Le message "Notre Account Manager vous
 *   contactera sous 24h" était une promesse vide.
 *
 *   APRÈS (cette version) : vraie inscription connectée à Supabase + RPC.
 *   Trois états selon la session utilisateur :
 *
 *   1. NON CONNECTÉ → Étape A : création du compte (signUp Supabase)
 *      Au submit : signUp + signIn automatique → passage à Étape B
 *
 *   2. CONNECTÉ MAIS SANS RESTO → Étape B : informations du restaurant
 *      Au submit : appel à createMyRestaurant (resto créé en `pending`)
 *      Redirect vers /restaurant (qui affichera l'écran "En attente")
 *
 *   3. CONNECTÉ AVEC RESTO → redirect immédiat vers /restaurant
 *      Évite qu'un partenaire déjà inscrit refasse une demande par accident.
 */
export const Route = createFileRoute("/devenir-resto")({
  head: () => ({
    meta: [
      { title: "Devenir Restaurant Partenaire — MboaEats" },
      {
        name: "description",
        content:
          "Rejoignez MboaEats : développez votre restaurant à Douala et Yaoundé. +40% de commandes en moyenne.",
      },
    ],
  }),
  component: DevenirResto,
});

// ─────────────────────────────────────────────────────────────────────────────
// Schémas de validation
// ─────────────────────────────────────────────────────────────────────────────

const emailSchema = z.string().trim().toLowerCase().email("Email invalide");
const passwordSchema = z
  .string()
  .min(6, "Mot de passe trop court (6 caractères minimum)")
  .max(72, "Mot de passe trop long");
const nameSchema = z
  .string()
  .trim()
  .min(2, "Votre nom est requis")
  .max(80, "Nom trop long");
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?\d[\d\s\-().]{6,20}$/, "Téléphone invalide (format international)");
const restoNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom du restaurant est requis")
  .max(120, "Nom trop long");
const cuisineSchema = z
  .string()
  .trim()
  .min(2, "Indiquez le type de cuisine")
  .max(80, "Trop long");
const cityChoices = ["Douala", "Yaoundé"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

function DevenirResto() {
  const navigate = useNavigate();
  const fetchMyResto = useServerFn(getMyRestaurant);
  const createResto = useServerFn(createMyRestaurant);

  type Phase =
    | "loading" // détermination de la phase initiale en cours
    | "account" // étape A : créer un compte (non connecté)
    | "resto" // étape B : infos du restaurant (connecté, pas de resto)
    | "done"; // confirmation finale

  const [phase, setPhase] = useState<Phase>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Au mount : déterminer dans quelle phase démarrer.
  // 1. Connecté + a déjà un resto → redirect /restaurant
  // 2. Connecté + pas de resto → phase "resto"
  // 3. Pas connecté → phase "account"
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;

      if (!user) {
        setPhase("account");
        return;
      }

      // L'utilisateur est connecté. A-t-il déjà un restaurant ?
      setUserEmail(user.email ?? null);
      try {
        const { restaurant } = await fetchMyResto();
        if (!alive) return;
        if (restaurant) {
          // Déjà partenaire : on l'envoie directement vers son espace.
          // C'est /restaurant qui décidera s'il voit "En attente", "Refusé"
          // ou le dashboard, selon validation_status.
          navigate({ to: "/restaurant", replace: true });
          return;
        }
        setPhase("resto");
      } catch {
        // En cas d'erreur de fetch, on suppose qu'il n'a pas de resto et on
        // affiche l'étape resto. Au pire, l'appel createMyRestaurant échouera
        // proprement plus tard avec le garde-fou anti-doublon.
        setPhase("resto");
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchMyResto, navigate]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "done") {
    return <DoneScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 pb-20">
      {/* Header propre, sans dépendance au layout client */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Link
            to="/"
            className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-neutral-900">
              Devenir Restaurant Partenaire
            </h1>
            <p className="text-xs text-neutral-500">
              {phase === "account" ? "Étape 1 / 2 — Votre compte" : "Étape 2 / 2 — Votre restaurant"}
            </p>
          </div>
          {/* Bouton "j'ai déjà un compte" */}
          {phase === "account" && (
            <Link
              to="/restaurant/connexion"
              className="hidden text-xs font-semibold text-emerald-700 hover:underline sm:inline"
            >
              J'ai déjà un compte →
            </Link>
          )}
        </div>
        {/* Barre de progression */}
        <div className="h-1 w-full bg-neutral-200">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all"
            style={{ width: phase === "account" ? "50%" : "100%" }}
          />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6">
        {/* Bandeau d'introduction */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-xl">
          <Store className="h-10 w-10" />
          <h2 className="mt-3 font-display text-2xl font-bold">
            Faites grandir votre restaurant 🚀
          </h2>
          <p className="mt-2 text-sm opacity-90">
            Rejoignez les restaurants de Douala et Yaoundé qui boostent leurs
            ventes avec MboaEats.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <StatBlock icon={TrendingUp} value="+40%" label="commandes" />
            <StatBlock icon={Users} value="150k" label="clients" />
            <StatBlock icon={Star} value="4.8 ★" label="note moy." />
          </div>
        </div>

        {/* Lien mobile "j'ai déjà un compte" */}
        {phase === "account" && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-3 text-center sm:hidden">
            <span className="text-xs text-neutral-600">Déjà partenaire ? </span>
            <Link
              to="/restaurant/connexion"
              className="text-sm font-bold text-emerald-700 hover:underline"
            >
              Se connecter →
            </Link>
          </div>
        )}

        {/* Le formulaire de l'étape en cours */}
        <div className="mt-6">
          {phase === "account" && (
            <AccountStep
              onAccountCreated={(email) => {
                setUserEmail(email);
                setPhase("resto");
              }}
            />
          )}
          {phase === "resto" && (
            <RestoStep
              userEmail={userEmail}
              createResto={createResto}
              onDone={() => navigate({ to: "/restaurant", replace: true })}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Étape A — Création du compte
// ─────────────────────────────────────────────────────────────────────────────

function AccountStep({
  onAccountCreated,
}: {
  onAccountCreated: (email: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+237 ");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // Validation stricte avant l'appel réseau
    const nm = nameSchema.safeParse(fullName);
    if (!nm.success) return setErr(nm.error.issues[0].message);
    const ph = phoneSchema.safeParse(phone);
    if (!ph.success) return setErr(ph.error.issues[0].message);
    const em = emailSchema.safeParse(email);
    if (!em.success) return setErr(em.error.issues[0].message);
    const p = passwordSchema.safeParse(pwd);
    if (!p.success) return setErr(p.error.issues[0].message);

    setBusy(true);
    try {
      // 1) Création du compte Supabase
      const { data, error } = await supabase.auth.signUp({
        email: em.data,
        password: p.data,
        options: {
          // Note : emailRedirectTo pointe vers /devenir-resto pour que le
          // restaurateur qui confirme son email revienne sur la bonne page.
          emailRedirectTo: `${window.location.origin}/devenir-resto`,
          data: {
            full_name: nm.data,
            phone: phone.trim(),
            role_hint: "restaurant",
          },
        },
      });

      if (error) {
        if (error.message?.toLowerCase().includes("already")) {
          setErr(
            "Un compte existe déjà pour cet email. Connectez-vous à votre espace partenaire.",
          );
        } else {
          setErr(error.message);
        }
        return;
      }

      // 2) Selon la config Supabase :
      //    - Si "confirm email" est désactivé : data.session est non-null → on
      //      enchaîne directement vers l'étape resto.
      //    - Si "confirm email" est activé : data.session est null → on
      //      affiche un message demandant de confirmer l'email puis de
      //      revenir.
      if (data.session) {
        toast.success("Compte créé ! Configurons votre restaurant.");
        onAccountCreated(em.data);
        return;
      }

      // Session null = confirmation email obligatoire
      setPendingConfirmation(em.data);
    } finally {
      setBusy(false);
    }
  }

  // Écran "vérifiez votre email" (si confirmation requise par Supabase)
  if (pendingConfirmation) {
    return (
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Mail className="h-8 w-8 text-emerald-600" strokeWidth={2.25} />
        </div>
        <h3 className="mt-5 text-center font-display text-xl font-bold text-neutral-900">
          Vérifiez votre email
        </h3>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Nous avons envoyé un lien de confirmation à{" "}
          <span className="font-bold">{pendingConfirmation}</span>.
        </p>
        <p className="mt-3 text-center text-xs text-neutral-500">
          Cliquez sur le lien dans votre boîte mail, puis revenez sur cette page
          pour finaliser l'inscription de votre restaurant.
        </p>
        <div className="mt-6 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          📩 Pensez à vérifier vos <strong>spams</strong> ou{" "}
          <strong>courrier indésirable</strong> si vous ne voyez pas l'email.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h3 className="font-display text-xl font-bold text-neutral-900">
        Créez votre compte partenaire
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        Vos identifiants vous permettront d'accéder à votre tableau de bord.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field
          icon={UserIcon}
          label="Votre nom complet"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jean Mballa"
        />
        <Field
          icon={Phone}
          label="Téléphone du gérant"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+237 6XX XX XX XX"
        />
        <Field
          icon={Mail}
          label="Email professionnel"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@monrestaurant.com"
        />
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
            Mot de passe
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
            <Lock className="h-4 w-4 text-neutral-400" />
            <input
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="6 caractères minimum"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Masquer" : "Afficher"}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {err && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-neutral-500">
          En continuant, vous acceptez nos{" "}
          <Link to="/cgu" className="underline hover:text-neutral-800">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link to="/confidentialite" className="underline hover:text-neutral-800">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Étape B — Informations du restaurant
// ─────────────────────────────────────────────────────────────────────────────

function RestoStep({
  userEmail,
  onCreated,
}: {
  userEmail: string | null;
  onCreated: (data: {
    name: string;
    cuisine: string;
    city: string;
    neighborhood?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [city, setCity] = useState<(typeof cityChoices)[number]>("Douala");
  const [neighborhood, setNeighborhood] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!accepted) {
      return setErr("Vous devez accepter les conditions partenaires pour continuer.");
    }
    const n = restoNameSchema.safeParse(name);
    if (!n.success) return setErr(n.error.issues[0].message);
    const c = cuisineSchema.safeParse(cuisine);
    if (!c.success) return setErr(c.error.issues[0].message);

    setBusy(true);
    try {
      await onCreated({
        name: n.data,
        cuisine: c.data,
        city,
        neighborhood: neighborhood.trim() || undefined,
      });
    } catch (e: any) {
      setErr(e?.message ?? "Une erreur est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h3 className="font-display text-xl font-bold text-neutral-900">
        Informations de votre restaurant
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        {userEmail ? (
          <>
            Compte connecté : <span className="font-semibold">{userEmail}</span>
          </>
        ) : (
          "Décrivez votre restaurant en quelques champs."
        )}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field
          icon={Building2}
          label="Nom du restaurant"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chez Mama Biya"
        />
        <Field
          icon={Utensils}
          label="Type de cuisine"
          type="text"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          placeholder="Camerounaise, fast-food, africaine…"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
              Ville
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value as (typeof cityChoices)[number])}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {cityChoices.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <Field
            icon={MapPin}
            label="Quartier"
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Akwa, Bastos…"
          />
        </div>

        {/* Encart modération */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Modération sous 24-48h ouvrées</p>
              <p className="mt-1 leading-relaxed">
                Notre équipe vérifiera vos informations avant d'activer votre
                tableau de bord. Vous recevrez un email à la décision.
              </p>
            </div>
          </div>
        </div>

        {/* Acceptation conditions */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:border-neutral-300">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600"
          />
          <span className="text-xs text-neutral-700">
            J'accepte les{" "}
            <Link to="/cgu" className="font-semibold text-emerald-700 underline">
              conditions partenaires
            </Link>{" "}
            ainsi que la commission de service appliquée par MboaEats sur
            chaque commande livrée.
          </span>
        </label>

        {err && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Soumettre ma demande <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Écran de confirmation finale
// ─────────────────────────────────────────────────────────────────────────────

function DoneScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold text-neutral-900 sm:text-3xl">
          Demande envoyée !
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          Votre dossier est entre les mains de notre équipe. Nous vous
          recontacterons sous <strong>24 à 48h ouvrées</strong>.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            Prochaines étapes
          </p>
          <ol className="mt-3 space-y-2 text-xs text-neutral-700">
            <li className="flex gap-2">
              <span className="font-bold text-emerald-700">1.</span>
              <span>Notre équipe vérifie vos informations</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-emerald-700">2.</span>
              <span>Vous recevez un email à la décision</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-emerald-700">3.</span>
              <span>Si validé, votre tableau de bord s'active automatiquement</span>
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/restaurant"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 px-5 text-sm font-bold text-white shadow-lg"
          >
            Voir mon espace
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composants utilitaires
// ─────────────────────────────────────────────────────────────────────────────

function StatBlock({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof TrendingUp;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
      <Icon className="mx-auto h-4 w-4" />
      <p className="mt-1 font-display text-base font-bold leading-none">
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  ...rest
}: {
  icon: typeof Building2;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-neutral-700">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
        <Icon className="h-4 w-4 text-neutral-400" />
        <input
          {...rest}
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
        />
      </div>
    </label>
  );
}
