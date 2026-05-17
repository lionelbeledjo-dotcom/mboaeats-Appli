import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Bike, Upload, CheckCircle2, Wallet, Clock, Shield,
  IdCard, FileText, Phone, MapPin, User as UserIcon, Loader2, AlertCircle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyDriverProfile,
  submitDriverApplication,
} from "@/lib/driver-onboarding.functions";

export const Route = createFileRoute("/devenir-livreur")({
  head: () => ({
    meta: [
      { title: "Devenir Livreur — MboaEats" },
      { name: "description", content: "Rejoignez la flotte MboaEats." },
    ],
  }),
  component: DevenirLivreur,
});

type Form = {
  full_name: string;
  phone: string;
  city: string;
  vehicle_type: string;
  plate_number: string;
};

function DevenirLivreur() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyDriverProfile);
  const submit = useServerFn(submitDriverApplication);

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [existing, setExisting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>({
    full_name: "", phone: "", city: "Douala", vehicle_type: "Moto", plate_number: "",
  });
  const [files, setFiles] = useState<{ photo?: File; cni?: File; permis?: File }>({});
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!signedIn) { setLoading(false); return; }
    fetchProfile()
      .then(({ profile }) => setExisting(profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [signedIn, fetchProfile]);

  const handleFile = (key: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFiles((p) => ({ ...p, [key]: f }));
  };

  const uploadFile = async (file: File, kind: string) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("driver-docs").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return path;
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.plate_number.trim()) {
      toast.error("Nom, téléphone et plaque sont requis"); setStep(1); return;
    }
    if (!files.photo || !files.cni) {
      toast.error("Photo et CNI sont obligatoires"); setStep(2); return;
    }
    if (!agree) { toast.error("Veuillez accepter les conditions"); return; }
    setSubmitting(true);
    try {
      const [photo_url, cni_url, permis_url] = await Promise.all([
        uploadFile(files.photo, "photo"),
        uploadFile(files.cni, "cni"),
        files.permis ? uploadFile(files.permis, "permis") : Promise.resolve(null),
      ]);
      const { profile } = await submit({
        data: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          city: form.city || null,
          vehicle_type: form.vehicle_type || null,
          plate_number: form.plate_number.trim(),
          photo_url, cni_url, permis_url,
        },
      });
      setExisting(profile);
      toast.success("Candidature envoyée !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady || loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!signedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Bike className="h-10 w-10 text-primary" />
        <h1 className="font-display text-2xl font-bold">Devenir Livreur</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Connectez-vous pour soumettre votre candidature.</p>
        <Link to="/connexion" className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground">Se connecter</Link>
      </div>
    );
  }

  if (existing && existing.status === "en_attente") {
    return <StatusScreen icon={<Clock className="h-10 w-10 text-primary-foreground" />} title="Candidature en cours d'examen"
      message="Votre compte est en attente de validation par l'administration. Vous serez notifié dès qu'elle sera traitée." />;
  }
  if (existing && existing.status === "valide") {
    return <StatusScreen icon={<CheckCircle2 className="h-10 w-10 text-primary-foreground" />} title="Compte validé !"
      message="Votre compte livreur est actif. Accédez à votre espace pour commencer à recevoir des courses."
      cta={<button onClick={() => navigate({ to: "/livreur" })} className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground">Espace livreur</button>} />;
  }
  if (existing && existing.status === "rejete") {
    return <StatusScreen icon={<AlertCircle className="h-10 w-10 text-primary-foreground" />} title="Candidature refusée"
      message={existing.rejection_reason || "Votre dossier n'a pas été retenu."}
      cta={<button onClick={() => setExisting(null)} className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground">Soumettre à nouveau</button>} />;
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
        <div className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
          <Bike className="h-10 w-10" />
          <h2 className="mt-3 font-display text-2xl font-bold">Roulez avec MboaEats 🛵</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { icon: Wallet, t: "Gains élevés" },
              { icon: Clock, t: "Horaires libres" },
              { icon: Shield, t: "Assurance" },
            ].map((b) => (
              <div key={b.t} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <b.icon className="h-4 w-4" />
                <p className="mt-1 text-xs font-bold">{b.t}</p>
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Vos informations</h3>
            <Field icon={UserIcon} label="Nom complet" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Ex : Jean Mboa" />
            <Field icon={Phone} label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+237 6XX XX XX XX" type="tel" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} options={["Douala", "Yaoundé", "Bafoussam"]} />
              <Select label="Véhicule" value={form.vehicle_type} onChange={(v) => setForm({ ...form, vehicle_type: v })} options={["Moto", "Scooter", "Vélo électrique", "Voiture"]} />
            </div>
            <Field icon={MapPin} label="Plaque moto" value={form.plate_number} onChange={(v) => setForm({ ...form, plate_number: v })} placeholder="Ex : LT-1234-AB" />
          </section>
        )}

        {step === 2 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Documents officiels</h3>
            <p className="text-xs text-muted-foreground">JPG, PNG ou PDF · 5 Mo max.</p>
            <Uploader icon={UserIcon} label="Photo d'identité (selfie)" onChange={handleFile("photo")} value={files.photo?.name} />
            <Uploader icon={IdCard} label="CNI" onChange={handleFile("cni")} value={files.cni?.name} />
            <Uploader icon={FileText} label="Permis de conduire (optionnel)" onChange={handleFile("permis")} value={files.permis?.name} />
          </section>
        )}

        {step === 3 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Dernière étape</h3>
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-sm font-semibold">Engagement</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Je certifie que mes documents sont authentiques.</li>
                <li>• Je respecterai le code de conduite MboaEats.</li>
              </ul>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 accent-[oklch(var(--primary))]" />
              <span className="text-sm">J'accepte les conditions ci-dessus</span>
            </label>
          </section>
        )}

        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} disabled={submitting}
              className="flex-1 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50">Précédent</button>
          )}
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : handleSubmit())}
            disabled={submitting}
            className="flex-1 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {step < 3 ? "Continuer" : "Envoyer ma candidature"}
          </button>
        </div>
      </main>
    </div>
  );
}

function StatusScreen({ icon, title, message, cta }: { icon: React.ReactNode; title: string; message: string; cta?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow">{icon}</div>
        <h1 className="mt-6 font-display text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {cta}
          <Link to="/" className="text-sm text-muted-foreground underline">Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, ...rest }: { icon: typeof UserIcon; label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 focus-within:border-primary">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{value ?? "Touchez pour ajouter un fichier"}</p>
        </div>
        <Upload className="h-4 w-4 text-muted-foreground" />
      </div>
      <input type="file" accept="image/*,.pdf" onChange={onChange} className="hidden" />
    </label>
  );
}
