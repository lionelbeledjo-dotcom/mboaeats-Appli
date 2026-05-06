import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Store, TrendingUp, Users, Star, CheckCircle2,
  Building2, Phone, Mail, MapPin, Utensils, Plus, X, Upload,
} from "lucide-react";

export const Route = createFileRoute("/devenir-resto")({
  head: () => ({
    meta: [
      { title: "Devenir Restaurant Partenaire — MboaEats" },
      { name: "description", content: "Rejoignez MboaEats : développez votre restaurant à Douala et Yaoundé. +40% de commandes en moyenne." },
    ],
  }),
  component: DevenirResto,
});

type Dish = { name: string; price: string; category: string };

function DevenirResto() {
  const [step, setStep] = useState(1);
  const [menu, setMenu] = useState<Dish[]>([]);
  const [draft, setDraft] = useState<Dish>({ name: "", price: "", category: "Plats" });
  const [done, setDone] = useState(false);

  const stats = [
    { icon: TrendingUp, value: "+40%", label: "de commandes" },
    { icon: Users, value: "150k", label: "clients actifs" },
    { icon: Star, value: "4.8 ★", label: "note moyenne" },
  ];

  const addDish = () => {
    if (!draft.name || !draft.price) return;
    setMenu([...menu, draft]);
    setDraft({ name: "", price: "", category: draft.category });
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold">Bienvenue dans la famille MboaEats !</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notre Account Manager vous contactera sous 24h pour activer votre tableau de bord et installer la tablette de commandes.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/restaurant" className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              Découvrir le tableau de bord
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Retour à l'accueil</Link>
          </div>
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
            <h1 className="font-display text-lg font-bold">Devenir Restaurant Partenaire</h1>
            <p className="text-xs text-muted-foreground">Étape {step} / 3</p>
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
          <Store className="h-10 w-10" />
          <h2 className="mt-3 font-display text-2xl font-bold">Faites grandir votre restaurant 🚀</h2>
          <p className="mt-2 text-sm opacity-90">
            Rejoignez +500 restaurants à Douala et Yaoundé qui boostent leurs ventes avec MboaEats.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 p-3 text-center backdrop-blur">
                <s.icon className="mx-auto h-4 w-4" />
                <p className="mt-1 font-display text-lg font-bold">{s.value}</p>
                <p className="text-[10px] opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: restaurant info */}
        {step === 1 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Informations du restaurant</h3>
            <Field icon={Building2} label="Nom du restaurant" placeholder="Ex : Chez Mama Biya" />
            <Field icon={Utensils} label="Type de cuisine" placeholder="Camerounaise, fast-food, etc." />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Ville" options={["Douala", "Yaoundé", "Bafoussam"]} />
              <Field icon={MapPin} label="Quartier" placeholder="Akwa, Bastos..." />
            </div>
            <Field icon={Phone} label="Téléphone du gérant" placeholder="+237 6XX XX XX XX" type="tel" />
            <Field icon={Mail} label="Email professionnel" placeholder="contact@restaurant.cm" type="email" />

            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Logo / photo de couverture</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-card p-4 hover:border-primary/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-sm text-muted-foreground">JPG/PNG · 5 Mo max</span>
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
          </section>
        )}

        {/* Step 2: menu builder */}
        {step === 2 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Composez votre menu</h3>
            <p className="text-xs text-muted-foreground">Ajoutez au moins 5 plats. Vous pourrez tout modifier plus tard depuis le tableau de bord.</p>

            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Nouveau plat</p>
              <div className="space-y-2">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Nom du plat (ex: Ndolé + Plantain)"
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    placeholder="Prix FCFA"
                    type="number"
                    className="rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option>Entrées</option>
                    <option>Plats</option>
                    <option>Grillades</option>
                    <option>Desserts</option>
                    <option>Boissons</option>
                  </select>
                </div>
                <button
                  onClick={addDish}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/25"
                >
                  <Plus className="h-4 w-4" /> Ajouter au menu
                </button>
              </div>
            </div>

            {menu.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Menu ({menu.length})</p>
                <ul className="space-y-2">
                  {menu.map((d, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3 animate-fade-in">
                      <div>
                        <p className="text-sm font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.category} · {Number(d.price).toLocaleString("fr-FR")} FCFA</p>
                      </div>
                      <button onClick={() => setMenu(menu.filter((_, j) => j !== i))} aria-label="Retirer" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Step 3: commission & confirm */}
        {step === 3 && (
          <section className="mt-6 space-y-4 animate-fade-in">
            <h3 className="font-display text-lg font-bold">Conditions du partenariat</h3>
            <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
              <p className="text-sm font-bold text-gold">Commission : 18% par commande</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inclut : visibilité dans l'app, paiement Mobile Money, support 7j/7, livraison gérée par MboaEats.
              </p>
            </div>
            <Field icon={Building2} label="Numéro contribuable / RCCM" placeholder="Ex : M030210045871H" />
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-card p-4">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[oklch(var(--primary))]" />
              <span className="text-sm">J'accepte les conditions générales et la <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>.</span>
            </label>
          </section>
        )}

        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold hover:bg-muted">
              Précédent
            </button>
          )}
          <button
            onClick={() => (step < 3 ? setStep(step + 1) : setDone(true))}
            className="flex-1 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
          >
            {step < 3 ? "Continuer" : "Valider mon inscription"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({ icon: Icon, label, ...rest }: { icon: typeof Building2; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
