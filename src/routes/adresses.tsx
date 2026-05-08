import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MapPin, ArrowLeft, Home, Briefcase, Heart, Loader2, Phone, Check, Save, Pencil, X, Trash2, Clock, Bike, Wand2, Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listMyAddresses, upsertMyAddress, deleteMyAddress } from "@/server/account.functions";

export const Route = createFileRoute("/adresses")({
  head: () => ({
    meta: [
      { title: "Mes adresses · MboaEats" },
      { name: "description", content: "Ajoutez et gérez vos adresses de livraison." },
    ],
  }),
  component: AddressesPage,
});

const CITIES = ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Bamenda", "Buea", "Kribi", "Maroua", "Ngaoundéré", "Limbe"] as const;

type Saved = {
  id: string;
  label: string;
  city: string;
  neighborhood: string;
  phone: string;
};

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("bureau") || l.includes("trav")) return <Briefcase className="h-4 w-4" />;
  if (l.includes("maison") || l.includes("dom") || l.includes("home")) return <Home className="h-4 w-4" />;
  return <Heart className="h-4 w-4" />;
}

// --- Validation & formatage du numéro Cameroun (+237) ---
// Mobiles CM : 9 chiffres, commencent par 6 (préfixes opérateurs 65/66/67/68/69).
const CM_MOBILE_PREFIXES = ["65", "66", "67", "68", "69"];

/** Garde uniquement les chiffres et retire un éventuel "237" en tête. */
function normalizeCmDigits(input: string): string {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("237")) d = d.slice(3);
  return d.slice(0, 9);
}

/** Formate "6XX XX XX XX" au fil de la frappe. */
function formatCmPhone(input: string): string {
  const d = normalizeCmDigits(input);
  const parts = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(" ");
}

/** Valide un numéro mobile Cameroun (9 chiffres, préfixe 65/66/67/68/69). */
function validateCmPhone(input: string): { ok: boolean; digits: string; error?: string } {
  const digits = normalizeCmDigits(input);
  if (digits.length === 0) return { ok: false, digits, error: "Numéro requis." };
  if (digits.length < 9) return { ok: false, digits, error: "Le numéro doit contenir 9 chiffres après +237." };
  if (!digits.startsWith("6")) return { ok: false, digits, error: "Un mobile camerounais commence par 6." };
  if (!CM_MOBILE_PREFIXES.includes(digits.slice(0, 2))) {
    return { ok: false, digits, error: "Préfixe invalide (attendu 65, 66, 67, 68 ou 69)." };
  }
  return { ok: true, digits };
}

function AddressesPage() {
  const navigate = useNavigate();
  const [label, setLabel] = useState("Domicile");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState<(typeof CITIES)[number]>("Douala");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState<Saved[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Saved | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const cityInfo = useCityDelivery(city);

  const reloadList = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const res = await listMyAddresses();
      const list = (res?.addresses ?? []).map((a: any) => ({
        id: a.id,
        label: a.label ?? "Adresse",
        city: a.city ?? "",
        neighborhood: a.neighborhood ?? "",
        phone: "",
      }));
      setSaved(list);
    } catch {
      // silencieux
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    const prev = saved;
    setSaved((s) => s.filter((x) => x.id !== id));
    if (id.startsWith("local-")) {
      setDeletingId(null);
      setConfirmDeleteId(null);
      toast.success("Adresse supprimée");
      return;
    }
    try {
      await deleteMyAddress({ data: { id } });
      toast.success("Adresse supprimée ✅");
      await reloadList();
    } catch (e: any) {
      setSaved(prev);
      toast.error("Suppression impossible", { description: e?.message ?? "Réessayez." });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const startEdit = (a: Saved) => {
    setEditingId(a.id);
    setEditDraft({ ...a, phone: formatCmPhone(a.phone.replace(/^\+237\s*/, "")) });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };
  const saveEdit = async () => {
    if (!editDraft) return;
    if (!editDraft.label.trim() || !editDraft.neighborhood.trim()) {
      toast.error("Label et rue/quartier sont requis.");
      return;
    }
    const v = validateCmPhone(editDraft.phone);
    if (!v.ok) {
      toast.error("Numéro invalide", { description: v.error });
      return;
    }
    const phoneFull = `+237 ${formatCmPhone(v.digits)}`;
    setSavingEdit(true);
    const updated: Saved = {
      ...editDraft,
      label: editDraft.label.trim(),
      neighborhood: editDraft.neighborhood.trim(),
      phone: phoneFull,
    };
    setSaved((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    try {
      await upsertMyAddress({
        data: {
          id: updated.id.startsWith("local-") ? undefined : updated.id,
          label: updated.label,
          city: updated.city,
          neighborhood: updated.neighborhood,
          line: `${updated.neighborhood}${phoneFull ? ` · Tél : ${phoneFull}` : ""}`,
        },
      });
    } catch {
      // garde la mise à jour locale
    }
    setSavingEdit(false);
    toast.success("Adresse mise à jour ✅");
    cancelEdit();
  };


  useEffect(() => {
    let active = true;
    (async () => {
      await reloadList();
      if (active) setLoadingList(false);
    })();
    return () => { active = false; };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !neighborhood.trim()) {
      toast.error("Merci de remplir tous les champs.");
      return;
    }
    const v = validateCmPhone(phone);
    if (!v.ok) {
      toast.error("Numéro invalide", { description: v.error });
      return;
    }
    const phoneFull = `+237 ${formatCmPhone(v.digits)}`;
    setSaving(true);

    // Simule l'enregistrement local immédiat
    const optimistic: Saved = {
      id: `local-${Date.now()}`,
      label: label.trim(),
      city,
      neighborhood: neighborhood.trim(),
      phone: phoneFull,
    };
    setSaved((prev) => [optimistic, ...prev]);

    // Tente la persistance distante (silencieuse en cas d'échec)
    try {
      await upsertMyAddress({
        data: {
          label: label.trim(),
          city,
          neighborhood: neighborhood.trim(),
          line: `${neighborhood.trim()} · Tél : ${phoneFull}`,
        },
      });
    } catch {
      // l'utilisateur peut ne pas être connecté — on garde l'état local
    }

    toast.success("Adresse enregistrée ✅", {
      description: `${optimistic.label} · ${optimistic.city}`,
      duration: 1800,
    });

    setSaving(false);
    setTimeout(() => navigate({ to: "/profil" }), 600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <Link
            to="/profil"
            aria-label="Retour à mon compte"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Mon compte
          </Link>
          <span className="font-display text-sm font-bold">Mes adresses</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8">
        <section className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <MapPin className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">
            Ajouter une <span className="text-gradient-primary">adresse</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour des livraisons rapides et précises au Cameroun 🇨🇲
          </p>
        </section>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-3xl border border-border bg-surface/60 p-5 shadow-card md:p-7"
        >
          <Field label="Label de l'adresse" hint="Ex. Domicile, Bureau, Chez Tata">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              placeholder="Domicile"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              required
            />
          </Field>

          <Field label="Rue / Quartier">
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              maxLength={120}
              placeholder="Bonapriso, en face de la pharmacie centrale"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              required
            />
          </Field>

          <Field label="Ville">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value as (typeof CITIES)[number])}
              className="w-full appearance-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <CityDeliveryPanel city={city} info={cityInfo} />
          </Field>

          <Field label="Numéro de téléphone de livraison" hint="Mobile Cameroun · 9 chiffres (6XX XX XX XX)">
            <PhoneField value={phone} onChange={setPhone} required />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-primary to-amber-500 px-5 py-4 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer l'adresse
          </button>
        </form>

        <section>
          <h2 className="font-display text-lg font-bold">Adresses enregistrées</h2>
          {loadingList ? (
            <div className="mt-4 flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : saved.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucune adresse enregistrée pour l'instant.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {saved.map((a) => {
                const isEditing = editingId === a.id && editDraft;
                return (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface/60 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    {iconFor(isEditing ? editDraft!.label : a.label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editDraft!.label}
                          onChange={(e) => setEditDraft({ ...editDraft!, label: e.target.value })}
                          placeholder="Label"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          type="text"
                          value={editDraft!.neighborhood}
                          onChange={(e) => setEditDraft({ ...editDraft!, neighborhood: e.target.value })}
                          placeholder="Rue / Quartier"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                        <select
                          value={editDraft!.city}
                          onChange={(e) => setEditDraft({ ...editDraft!, city: e.target.value })}
                          className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                        >
                          {CITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {(() => {
                          const v = validateCmPhone(editDraft!.phone);
                          const showError = editDraft!.phone.length > 0 && !v.ok;
                          return (
                            <>
                              <div
                                className={`flex items-stretch overflow-hidden rounded-xl border bg-background transition ${
                                  showError
                                    ? "border-destructive focus-within:ring-2 focus-within:ring-destructive/30"
                                    : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
                                }`}
                              >
                                <span className="inline-flex items-center gap-1 border-r border-border bg-surface px-2 text-xs font-semibold text-muted-foreground">
                                  <Phone className="h-3 w-3" /> +237
                                </span>
                                <input
                                  type="tel"
                                  inputMode="numeric"
                                  autoComplete="tel-national"
                                  value={editDraft!.phone}
                                  onChange={(e) =>
                                    setEditDraft({ ...editDraft!, phone: formatCmPhone(e.target.value) })
                                  }
                                  placeholder="6 99 12 34 56"
                                  maxLength={12}
                                  className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
                                />
                              </div>
                              {showError && (
                                <p className="-mt-1 text-[10px] font-medium text-destructive">{v.error}</p>
                              )}
                            </>
                          );
                        })()}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={savingEdit}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-primary to-amber-500 px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-70"
                          >
                            {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" /> Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">{a.label}</p>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            <Check className="-mt-0.5 mr-0.5 inline h-3 w-3" /> Enregistrée
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.neighborhood} · {a.city}
                        </p>
                        {a.phone && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            📞 {a.phone}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(a)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" /> Modifier
                          </button>
                          {confirmDeleteId === a.id ? (
                            <>
                              <span className="text-[11px] font-semibold text-destructive">Supprimer ?</span>
                              <button
                                type="button"
                                onClick={() => onDelete(a.id)}
                                disabled={deletingId === a.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
                              >
                                {deletingId === a.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                Confirmer
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" /> Annuler
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(a.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/20"
                            >
                              <Trash2 className="h-3 w-3" /> Supprimer
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {hint && <span className="ml-1 text-[11px] normal-case text-muted-foreground/70">— {hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

// ----- Délais & horaires de livraison par ville -----
type Zone = { neighborhood: string; eta_minutes: number; base_fee: number };
type CityInfo = {
  loading: boolean;
  zones: Zone[];
  etaMin: number | null;
  etaMax: number | null;
  feeMin: number | null;
  feeMax: number | null;
};

// Plages horaires de service par ville (locales — pas en BDD)
const CITY_HOURS: Record<string, string> = {
  Douala: "08h00 – 23h00",
  Yaoundé: "08h00 – 23h00",
  Bafoussam: "09h00 – 22h00",
  Garoua: "09h00 – 21h00",
  Bamenda: "09h00 – 21h00",
  Buea: "09h00 – 22h00",
  Kribi: "09h00 – 22h00",
  Maroua: "09h00 – 21h00",
  Ngaoundéré: "09h00 – 21h00",
  Limbe: "09h00 – 22h00",
};

function useCityDelivery(city: string): CityInfo {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("delivery_zones")
        .select("neighborhood, eta_minutes, base_fee")
        .eq("city", city)
        .eq("active", true)
        .order("eta_minutes", { ascending: true });
      if (!active) return;
      setZones((data ?? []) as Zone[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [city]);

  const etas = zones.map((z) => z.eta_minutes);
  const fees = zones.map((z) => z.base_fee);
  return {
    loading,
    zones,
    etaMin: etas.length ? Math.min(...etas) : null,
    etaMax: etas.length ? Math.max(...etas) : null,
    feeMin: fees.length ? Math.min(...fees) : null,
    feeMax: fees.length ? Math.max(...fees) : null,
  };
}

function CityDeliveryPanel({ city, info }: { city: string; info: CityInfo }) {
  const hours = CITY_HOURS[city] ?? "09h00 – 22h00";
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface/40 p-3">
      {info.loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des disponibilités à {city}…
        </div>
      ) : info.zones.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aucune zone de livraison active à <span className="font-semibold">{city}</span> pour le moment.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary">
              <Bike className="h-3 w-3" />
              {info.etaMin === info.etaMax ? `${info.etaMin} min` : `${info.etaMin}–${info.etaMax} min`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
              <Clock className="h-3 w-3" /> {hours}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-300">
              {info.feeMin === info.feeMax
                ? `${info.feeMin} FCFA`
                : `${info.feeMin}–${info.feeMax} FCFA`}
            </span>
          </div>
          <details className="mt-2 group">
            <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              Voir les {info.zones.length} quartiers desservis
            </summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {info.zones.map((z, i) => (
                <li
                  key={`${z.neighborhood}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="truncate font-medium">{z.neighborhood}</span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {z.eta_minutes} min · {z.base_fee} F
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

// Champ téléphone +237 réutilisable : auto-format, bouton "Reformater",
// aide contextuelle (chiffres restants, préfixe attendu) et état d'erreur.
function PhoneField({
  value,
  onChange,
  size = "md",
  required,
}: {
  value: string;
  onChange: (next: string) => void;
  size?: "sm" | "md";
  required?: boolean;
}) {
  const v = validateCmPhone(value);
  const digits = v.digits;
  const isEmpty = value.length === 0;
  const showError = !isEmpty && !v.ok && digits.length === 9;
  // "Différent du format canonique ?" → propose le bouton de reformat.
  const canonical = formatCmPhone(value);
  const needsReformat = !isEmpty && value !== canonical;

  // Aide contextuelle progressive
  let hint: string | null = null;
  if (!isEmpty && !v.ok) {
    if (digits.length === 0) hint = "Tapez votre numéro mobile (sans le +237).";
    else if (digits.length > 0 && !digits.startsWith("6"))
      hint = "Un mobile camerounais commence par 6.";
    else if (digits.length < 9) hint = `Encore ${9 - digits.length} chiffre${9 - digits.length > 1 ? "s" : ""}…`;
    else hint = v.error ?? null;
  } else if (v.ok) {
    hint = "Numéro valide ✓";
  }

  const pad = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-3 text-sm";
  const radius = size === "sm" ? "rounded-xl" : "rounded-2xl";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <>
      <div
        className={`flex items-stretch overflow-hidden border bg-background transition ${radius} ${
          showError
            ? "border-destructive focus-within:ring-2 focus-within:ring-destructive/30"
            : v.ok
            ? "border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/30"
            : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
        }`}
      >
        <span
          className={`inline-flex items-center gap-1.5 border-r border-border bg-surface ${
            size === "sm" ? "px-2 text-xs" : "px-3 text-sm"
          } font-semibold text-muted-foreground`}
        >
          <Phone className={iconSize} /> +237
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          onChange={(e) => onChange(formatCmPhone(e.target.value))}
          placeholder="6 99 12 34 56"
          maxLength={12}
          required={required}
          className={`flex-1 bg-transparent ${pad} outline-none placeholder:text-muted-foreground/60`}
        />
        {needsReformat && (
          <button
            type="button"
            onClick={() => onChange(canonical)}
            title="Reformater le numéro"
            aria-label="Reformater le numéro"
            className="inline-flex items-center gap-1 border-l border-border bg-surface/70 px-2.5 text-[11px] font-semibold text-primary hover:bg-surface"
          >
            <Wand2 className="h-3 w-3" /> Corriger
          </button>
        )}
        {!needsReformat && !isEmpty && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Effacer"
            aria-label="Effacer"
            className="inline-flex items-center border-l border-border bg-surface/70 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {hint && (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium ${
            showError ? "text-destructive" : v.ok ? "text-emerald-400" : "text-muted-foreground"
          }`}
        >
          {v.ok ? <Check className="h-3 w-3" /> : <Info className="h-3 w-3" />}
          {hint}
        </p>
      )}
    </>
  );
}
