import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Bike, Upload, CheckCircle2, Wallet, Clock, Shield,
  IdCard, FileText, Phone, MapPin, User as UserIcon, Mail,
} from "lucide-react";

export const Route = createFileRoute("/devenir-livreur")({
  head: () => ({
    meta: [
      { title: "Devenir Livreur — MboaEats" },
      { name: "description", content: "Rejoignez la flotte MboaEats. Gagnez jusqu'à 80 000 FCFA/semaine en livrant à Douala, Yaoundé et Bafoussam." },
    ],
  }),
  component: DevenirLivreur,
});

function DevenirLivreur() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<{ cni?: string; permis?: string; photo?: string }>({});
  const [done, setDone] = useState(false);

  const handleFile = (key: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFiles((p) => ({ ...p, [key]: f.name }));
  };

  const benefits = [
    { icon: Wallet, title: "Jusqu'à 80 000 FCFA / semaine", desc: "Pourboires et bonus météo inclus." },
    { icon: Clock, title: "Horaires libres", desc: "En ligne / Hors ligne en un clic." },
    { icon: Shield, title: "Assurance accident", desc: "Couverture complète pendant les courses." },
  ];

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">Candidature reçue !</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notre équipe étudie votre dossier. Vous recevrez un SMS sous 48h pour la suite (formation et remise du sac MboaEats).
          </p>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Link to="/" className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="font-display text-lg font-bold">Devenir Livreur</h1>
            <p className="text-xs text-muted-foreground">Étape {step} / 3</p>
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
          <Bike className="h-10 w-10" />
          <h2 className="mt-3 font-display text-2xl font-bold">Roulez avec MboaEats 🛵</h2>
          <p className="mt-2 text-sm opacity-90">
            Devenez livreur partenaire à Douala, Yaoundé ou Bafoussam.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <b.icon className="h-4 w-4" />
                <p className="mt-1 text-xs font-bold">{b.title}</p>
                <p className="text-[11px] opacity-80">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: identity */}
        {step === 1 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Vos informations</h3>
            <Field icon={UserIcon} label="Nom complet" placeholder="Ex : Jean Mboa" />
            <Field icon={Phone} label="Téléphone (MoMo)" placeholder="+237 6XX XX XX XX" type="tel" />
            <Field icon={Mail} label="Email" placeholder="vous@example.cm" type="email" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Ville" options={["Douala", "Yaoundé", "Bafoussam"]} />
              <Select label="Véhicule" options={["Moto", "Scooter", "Vélo électrique", "Voiture"]} />
            </div>
            <Field icon={MapPin} label="Quartier de résidence" placeholder="Ex : Akwa, Bonapriso..." />
          </section>
        )}

        {/* Step 2: documents */}
        {step === 2 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Documents officiels</h3>
            <p className="text-xs text-muted-foreground">JPG, PNG ou PDF · 5 Mo max par fichier · données chiffrées.</p>
            <Uploader icon={IdCard} label="Carte Nationale d'Identité (CNI)" onChange={handleFile("cni")} value={files.cni} />
            <Uploader icon={FileText} label="Permis de conduire" onChange={handleFile("permis")} value={files.permis} />
            <Uploader icon={UserIcon} label="Photo d'identité (selfie)" onChange={handleFile("photo")} value={files.photo} />
          </section>
        )}

        {/* Step 3: confirmation */}
        {step === 3 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Dernière étape</h3>
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-sm font-semibold">Engagement</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Je certifie que les documents fournis sont authentiques.</li>
                <li>• Je m'engage à respecter le code de conduite MboaEats.</li>
                <li>• J'accepte la <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>.</li>
              </ul>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
              <input type="checkbox" className="h-5 w-5 accent-[oklch(var(--primary))]" />
              <span className="text-sm">J'accepte les conditions ci-dessus</span>
            </label>
          </section>
        )}

        {/* Nav */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold hover:bg-muted"
            >
              Précédent
            </button>
          )}
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : setDone(true))}
            className="flex-1 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
          >
            {step < 3 ? "Continuer" : "Envoyer ma candidature"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({ icon: Icon, label, ...rest }: { icon: typeof UserIcon; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 focus-within:border-primary">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input {...rest} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>
    </label>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Uploader({ icon: Icon, label, onChange, value }: { icon: typeof IdCard; label: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; value?: string }) {
  return (
    <label className="block cursor-pointer">
      <div className={`flex items-center gap-3 rounded-2xl border-2 border-dashed p-4 transition ${value ? "border-primary/60 bg-primary/5" : "border-border/60 bg-card hover:border-primary/40"}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {value ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{value ?? "Touchez pour ajouter un fichier"}</p>
        </div>
        <Upload className="h-4 w-4 text-muted-foreground" />
      </div>
      <input type="file" accept="image/*,.pdf" onChange={onChange} className="hidden" />
    </label>
  );
}
