import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MapPin, ArrowLeft, Crosshair, Home, Briefcase, Heart, Plus,
  Phone, Pencil, Trash2, Check,
} from "lucide-react";

export const Route = createFileRoute("/adresses")({
  head: () => ({
    meta: [
      { title: "Mes adresses — MboaEats" },
      { name: "description", content: "Adresses flexibles : PIN sur carte + points de repère adaptés au Cameroun." },
    ],
  }),
  component: AddressesPage,
});

type Address = {
  id: string;
  nickname: string;
  icon: React.ReactNode;
  city: string;
  area: string;
  landmark: string;
  phone: string;
  primary?: boolean;
};

const initial: Address[] = [
  {
    id: "1",
    nickname: "Maison",
    icon: <Home className="h-4 w-4" />,
    city: "Douala",
    area: "Bonapriso, Rue Joffre",
    landmark: "Portail bleu derrière la pharmacie Sainte-Anne, 2ème étage",
    phone: "+237 691 24 56 78",
    primary: true,
  },
  {
    id: "2",
    nickname: "Bureau",
    icon: <Briefcase className="h-4 w-4" />,
    city: "Douala",
    area: "Akwa, Boulevard de la Liberté",
    landmark: "Immeuble Activa, demander à la sécurité au 3ème",
    phone: "+237 691 24 56 78",
  },
  {
    id: "3",
    nickname: "Chez maman",
    icon: <Heart className="h-4 w-4" />,
    city: "Yaoundé",
    area: "Bastos, derrière la station Total",
    landmark: "Maison à toit rouge, juste après le terrain de foot",
    phone: "+237 677 12 34 56",
  },
];

function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(initial);
  const [editing, setEditing] = useState<Address | null>(null);

  const setPrimary = (id: string) =>
    setAddresses((a) => a.map((x) => ({ ...x, primary: x.id === id })));
  const remove = (id: string) => setAddresses((a) => a.filter((x) => x.id !== id));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display text-sm font-semibold">Mes adresses</span>
          <button
            onClick={() => setEditing({ id: "", nickname: "", icon: <MapPin className="h-4 w-4" />, city: "Douala", area: "", landmark: "", phone: "" })}
            className="rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            + Ajouter
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Adresses <span className="text-gradient-primary">flexibles</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Au Cameroun, les rues n'ont pas toujours de numéro. Combine un PIN sur la carte
          avec un point de repère en français — comme tu l'expliquerais à un taxi.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Map preview */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <FakeMap />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
              <div className="glass rounded-2xl px-4 py-3">
                <p className="text-xs text-muted-foreground">Position détectée</p>
                <p className="text-sm font-semibold">Bonapriso · Douala</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105">
                <Crosshair className="h-4 w-4" /> Me localiser
              </button>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); setEditing(null); }}
            className="rounded-3xl border border-border bg-card p-5 shadow-card"
          >
            <p className="font-display text-lg font-bold">
              {editing && editing.id ? "Modifier l'adresse" : "Nouvelle adresse"}
            </p>
            <div className="mt-4 space-y-4">
              <Field label="Surnom (Maison, Bureau, Chez Tata…)">
                <input
                  type="text"
                  defaultValue={editing?.nickname ?? ""}
                  placeholder="Maison"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Ville">
                <select className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option>Douala</option><option>Yaoundé</option><option>Bafoussam</option>
                </select>
              </Field>
              <Field label="Quartier / rue">
                <input
                  type="text"
                  defaultValue={editing?.area ?? ""}
                  placeholder="Bonapriso, rue Joffre"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Point de repère" hint="Décris comme à un taxi 🚖">
                <textarea
                  rows={3}
                  defaultValue={editing?.landmark ?? ""}
                  placeholder="Portail bleu derrière la pharmacie, après le maquis Le Bantou…"
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Téléphone du destinataire">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    defaultValue={editing?.phone ?? ""}
                    placeholder="+237 6XX XX XX XX"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                  />
                </div>
              </Field>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Enregistrer cette adresse
              </button>
            </div>
          </form>
        </div>

        {/* Saved list */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Adresses enregistrées</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {addresses.map((a) => (
              <article
                key={a.id}
                className={`group rounded-2xl border p-4 shadow-card transition hover:-translate-y-0.5 ${
                  a.primary ? "border-primary/60 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      a.primary ? "bg-gradient-primary text-primary-foreground" : "bg-surface-elevated text-primary"
                    }`}>
                      {a.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{a.nickname}</p>
                      <p className="text-xs text-muted-foreground">{a.city} · {a.area}</p>
                    </div>
                  </div>
                  {a.primary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      <Check className="h-3 w-3" /> Par défaut
                    </span>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Point de repère</p>
                  <p className="mt-1 text-sm italic">"{a.landmark}"</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" /> {a.phone}</span>
                  <div className="flex items-center gap-1">
                    {!a.primary && (
                      <button onClick={() => setPrimary(a.id)} className="rounded-md p-1.5 hover:bg-surface-elevated" aria-label="Définir par défaut">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => setEditing(a)} className="rounded-md p-1.5 hover:bg-surface-elevated" aria-label="Modifier">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(a.id)} className="rounded-md p-1.5 hover:bg-destructive/15 hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <button
              onClick={() => setEditing({ id: "", nickname: "", icon: <MapPin className="h-4 w-4" />, city: "Douala", area: "", landmark: "", phone: "" })}
              className="flex min-h-[150px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 text-sm font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Ajouter une adresse
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {hint && <span className="ml-1 text-xs text-muted-foreground/70">— {hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function FakeMap() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden">
      {/* Stylized dark map */}
      <svg viewBox="0 0 800 600" className="h-full w-full" aria-hidden>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.3 0.04 280 / 0.5)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="oklch(0.66 0.22 36 / 0.4)" />
            <stop offset="100%" stopColor="oklch(0.66 0.22 36 / 0)" />
          </radialGradient>
        </defs>
        <rect width="800" height="600" fill="oklch(0.18 0.04 280)" />
        <rect width="800" height="600" fill="url(#grid)" />
        {/* "Wouri river" */}
        <path d="M 0 380 Q 200 320 400 360 T 800 320 L 800 600 L 0 600 Z" fill="oklch(0.22 0.05 240 / 0.6)" />
        {/* Roads */}
        <path d="M 100 0 L 250 600" stroke="oklch(0.4 0.04 280)" strokeWidth="6" />
        <path d="M 600 0 L 500 600" stroke="oklch(0.4 0.04 280)" strokeWidth="6" />
        <path d="M 0 200 L 800 250" stroke="oklch(0.4 0.04 280)" strokeWidth="4" />
        <path d="M 0 450 L 800 420" stroke="oklch(0.4 0.04 280)" strokeWidth="4" />
        <circle cx="400" cy="280" r="180" fill="url(#glow)" />
      </svg>

      {/* Pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <span className="absolute inset-0 -m-4 rounded-full bg-primary/40 animate-pulse-ring" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
