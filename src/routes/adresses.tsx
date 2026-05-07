import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MapPin, ArrowLeft, Crosshair, Home, Briefcase, Heart, Plus,
  Pencil, Trash2, Check, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyAddresses, upsertMyAddress, deleteMyAddress, setDefaultAddress,
} from "@/server/account.functions";

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
  label: string;
  city: string;
  neighborhood: string | null;
  line: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean | null;
};

type Draft = {
  id?: string;
  label: string;
  city: string;
  neighborhood: string;
  line: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
};

const emptyDraft: Draft = {
  label: "Maison",
  city: "Douala",
  neighborhood: "",
  line: "",
  lat: null,
  lng: null,
  is_default: false,
};

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("bureau") || l.includes("trav")) return <Briefcase className="h-4 w-4" />;
  if (l.includes("maison") || l.includes("home")) return <Home className="h-4 w-4" />;
  return <Heart className="h-4 w-4" />;
}

function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const reload = async () => {
    try {
      const { addresses } = await listMyAddresses();
      setAddresses(addresses as Address[]);
    } catch {}
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) { setAuthed(true); await reload(); }
      setLoading(false);
    });
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await upsertMyAddress({
        data: {
          id: editing.id,
          label: editing.label || "Maison",
          city: editing.city,
          neighborhood: editing.neighborhood || null,
          line: editing.line,
          lat: editing.lat,
          lng: editing.lng,
          is_default: editing.is_default,
        },
      });
      setEditing(null);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette adresse ?")) return;
    await deleteMyAddress({ data: { id } });
    await reload();
  };

  const setPrimary = async (id: string) => {
    setAddresses((a) => a.map((x) => ({ ...x, is_default: x.id === id })));
    await setDefaultAddress({ data: { id } });
  };

  const locate = () => {
    if (!navigator.geolocation || !editing) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditing({ ...editing, lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (!loading && !authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-card">
          <MapPin className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 font-display text-xl font-bold">Connectez-vous</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pour gérer vos adresses de livraison.</p>
          <Link to="/connexion" className="mt-4 inline-flex w-full justify-center rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/profil" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display text-sm font-semibold">Mes adresses</span>
          <button
            onClick={() => setEditing({ ...emptyDraft })}
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
          Au Cameroun, les rues n'ont pas toujours de numéro. Combine un PIN GPS
          avec un point de repère en français — comme tu l'expliquerais à un taxi.
        </p>

        {editing && (
          <form
            onSubmit={onSave}
            className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]"
          >
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <FakeMap />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                <div className="glass rounded-2xl px-4 py-3">
                  <p className="text-xs text-muted-foreground">Position GPS</p>
                  <p className="text-sm font-semibold">
                    {editing.lat && editing.lng
                      ? `${editing.lat.toFixed(4)}, ${editing.lng.toFixed(4)}`
                      : "Non détectée"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={locate}
                  disabled={locating}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:opacity-60"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                  Me localiser
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
              <p className="font-display text-lg font-bold">
                {editing.id ? "Modifier l'adresse" : "Nouvelle adresse"}
              </p>
              <div className="mt-4 space-y-4">
                <Field label="Surnom (Maison, Bureau, Chez Tata…)">
                  <input type="text" value={editing.label}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    placeholder="Maison" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </Field>
                <Field label="Ville">
                  <select value={editing.city}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                    <option>Douala</option><option>Yaoundé</option><option>Bafoussam</option>
                  </select>
                </Field>
                <Field label="Quartier">
                  <input type="text" value={editing.neighborhood}
                    onChange={(e) => setEditing({ ...editing, neighborhood: e.target.value })}
                    placeholder="Bonapriso" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </Field>
                <Field label="Adresse / point de repère" hint="Décris comme à un taxi 🚖">
                  <textarea rows={3} value={editing.line}
                    onChange={(e) => setEditing({ ...editing, line: e.target.value })}
                    placeholder="Portail bleu derrière la pharmacie, après le maquis Le Bantou…"
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.is_default}
                    onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} />
                  Définir par défaut
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditing(null)}
                    className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-semibold">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving || !editing.line}
                    className="flex-[1.4] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Adresses enregistrées</h2>
          {loading ? (
            <div className="mt-4 flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : addresses.length === 0 && !editing ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Aucune adresse encore. Ajoute ta première ci-dessus 👆
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {addresses.map((a) => (
                <article key={a.id} className={`group rounded-2xl border p-4 shadow-card transition hover:-translate-y-0.5 ${a.is_default ? "border-primary/60 bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.is_default ? "bg-gradient-primary text-primary-foreground" : "bg-surface-elevated text-primary"}`}>
                        {iconFor(a.label)}
                      </div>
                      <div>
                        <p className="font-semibold">{a.label}</p>
                        <p className="text-xs text-muted-foreground">{a.city}{a.neighborhood ? ` · ${a.neighborhood}` : ""}</p>
                      </div>
                    </div>
                    {a.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        <Check className="h-3 w-3" /> Par défaut
                      </span>
                    )}
                  </div>
                  <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Repère</p>
                    <p className="mt-1 text-sm italic">"{a.line}"</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> {a.lat && a.lng ? `${a.lat.toFixed(3)}, ${a.lng.toFixed(3)}` : "Sans GPS"}
                    </span>
                    <div className="flex items-center gap-1">
                      {!a.is_default && (
                        <button onClick={() => setPrimary(a.id)} className="rounded-md p-1.5 hover:bg-surface-elevated" aria-label="Définir par défaut">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => setEditing({
                        id: a.id, label: a.label, city: a.city, neighborhood: a.neighborhood ?? "",
                        line: a.line, lat: a.lat, lng: a.lng, is_default: !!a.is_default,
                      })} className="rounded-md p-1.5 hover:bg-surface-elevated" aria-label="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(a.id)} className="rounded-md p-1.5 hover:bg-destructive/15 hover:text-destructive" aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {!editing && (
                <button onClick={() => setEditing({ ...emptyDraft })}
                  className="flex min-h-[150px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 text-sm font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground">
                  <Plus className="h-4 w-4" /> Ajouter une adresse
                </button>
              )}
            </div>
          )}
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
      <svg viewBox="0 0 800 600" className="h-full w-full" aria-hidden>
        <defs>
          <pattern id="grid-adr" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.3 0.04 280 / 0.5)" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="glow-adr" cx="50%" cy="50%">
            <stop offset="0%" stopColor="oklch(0.66 0.22 36 / 0.4)" />
            <stop offset="100%" stopColor="oklch(0.66 0.22 36 / 0)" />
          </radialGradient>
        </defs>
        <rect width="800" height="600" fill="oklch(0.18 0.04 280)" />
        <rect width="800" height="600" fill="url(#grid-adr)" />
        <path d="M 0 380 Q 200 320 400 360 T 800 320 L 800 600 L 0 600 Z" fill="oklch(0.22 0.05 240 / 0.6)" />
        <path d="M 100 0 L 250 600" stroke="oklch(0.4 0.04 280)" strokeWidth="6" />
        <path d="M 600 0 L 500 600" stroke="oklch(0.4 0.04 280)" strokeWidth="6" />
        <path d="M 0 200 L 800 250" stroke="oklch(0.4 0.04 280)" strokeWidth="4" />
        <path d="M 0 450 L 800 420" stroke="oklch(0.4 0.04 280)" strokeWidth="4" />
        <circle cx="400" cy="280" r="180" fill="url(#glow-adr)" />
      </svg>
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
