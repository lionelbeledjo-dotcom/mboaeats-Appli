import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Store, Star, CheckCircle2, PauseCircle, Loader2, Search,
  MapPin, Utensils, ShieldCheck, ShieldOff, Filter, Eye, X,
  Phone, User, FileCheck2, FileX2, Hash, Image as ImageIcon, Clock,
  Pencil, Save, Crosshair,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listAllRestaurants, setRestaurantActive, getRestaurantDetails, updateRestaurantLocation } from "@/server/admin.functions";
import RestaurantMap from "@/components/admin/RestaurantMap";
import { supabase } from "@/integrations/supabase/client";
import { ErrorState } from "@/components/admin/ErrorState";

export const Route = createFileRoute("/admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Restaurants,
});

type Resto = {
  id: string; name: string; city: string; neighborhood: string | null;
  cuisine: string; rating: number | null; reviews_count: number | null;
  is_active: boolean | null; is_open: boolean | null;
};

type StatusFilter = "all" | "active" | "suspended";

type Details = {
  restaurant: Record<string, any>;
  owner: { full_name: string | null; phone: string | null; city: string | null } | null;
  stats: { dishes: number; orders: number };
} | null;

function Restaurants() {
  const fetchAll = useServerFn(listAllRestaurants);
  const setActive = useServerFn(setRestaurantActive);
  const fetchDetails = useServerFn(getRestaurantDetails);
  const [list, setList] = useState<Resto[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [city, setCity] = useState<string>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDetails = async (id: string) => {
    setOpenId(id);
    setDetails(null);
    setDetailsLoading(true);
    try {
      const d = await fetchDetails({ data: { id } });
      setDetails(d as Details);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      setOpenId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const reload = () => {
    setError(null);
    return fetchAll()
      .then((r) => setList(r.restaurants as Resto[]))
      .catch((e) => { setList([]); setError(e instanceof Error ? e.message : "Erreur réseau"); });
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("admin-restaurants")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, []);

  const updateStatus = async (r: Resto, next: boolean) => {
    const verb = next ? "Approuver" : "Désactiver";
    if (!window.confirm(`${verb} le restaurant « ${r.name} » ?`)) return;
    setPendingId(r.id);
    try {
      await setActive({ data: { id: r.id, is_active: next } });
      toast.success(next ? "Restaurant approuvé et publié" : "Restaurant désactivé");
      // Mise à jour optimiste pour éviter un round-trip
      setList((cur) =>
        (cur ?? []).map((x) => (x.id === r.id ? { ...x, is_active: next } : x))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPendingId(null);
    }
  };

  const counts = useMemo(() => {
    const all = list ?? [];
    return {
      all: all.length,
      active: all.filter((r) => r.is_active).length,
      suspended: all.filter((r) => !r.is_active).length,
    };
  }, [list]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    (list ?? []).forEach((r) => r.city && set.add(r.city));
    return Array.from(set).sort();
  }, [list]);

  const filtered = useMemo(() => {
    return (list ?? [])
      .filter((r) => {
        if (filter === "active") return !!r.is_active;
        if (filter === "suspended") return !r.is_active;
        return true;
      })
      .filter((r) => (city === "all" ? true : r.city === city))
      .filter((r) => {
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
          r.name.toLowerCase().includes(needle) ||
          r.city.toLowerCase().includes(needle) ||
          (r.neighborhood ?? "").toLowerCase().includes(needle) ||
          r.cuisine.toLowerCase().includes(needle)
        );
      });
  }, [list, filter, q, city]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Restaurants</h1>
          <p className="text-sm text-muted-foreground">
            {counts.all} partenaire{counts.all > 1 ? "s" : ""} ·{" "}
            <span className="text-emerald-400">{counts.active} actif{counts.active > 1 ? "s" : ""}</span> ·{" "}
            <span className="text-gold">{counts.suspended} en attente / suspendu{counts.suspended > 1 ? "s" : ""}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, ville, cuisine…"
              className="w-48 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Link
            to="/restaurant"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm hover:bg-surface/80"
          >
            Espace Restaurant
          </Link>
        </div>
      </div>

      {/* Tabs filtres */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/50 p-1.5">
        <Filter className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
        {([
          { key: "all", label: "Tous", count: counts.all },
          { key: "active", label: "Actifs", count: counts.active },
          { key: "suspended", label: "À approuver / suspendus", count: counts.suspended },
        ] as { key: StatusFilter; label: string; count: number }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filter === t.key
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-background"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                filter === t.key ? "bg-primary-foreground/20" : "bg-background"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none"
          >
            <option value="all">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={reload} />}

      {/* Loading */}
      {!list && !error && (
        <div className="flex justify-center p-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((r) => {
          const busy = pendingId === r.id;
          return (
            <div
              key={r.id}
              className="group flex flex-col rounded-3xl border border-border bg-surface/60 p-5 transition hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <Store className="h-5 w-5 text-primary-foreground" />
                </div>
                {r.is_active ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Actif
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">
                    <PauseCircle className="h-3 w-3" /> En attente
                  </span>
                )}
              </div>

              <h3 className="mt-3 font-display text-lg font-bold leading-tight">{r.name}</h3>

              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {r.city}
                  {r.neighborhood ? ` · ${r.neighborhood}` : ""}
                </p>
                <p className="flex items-center gap-1.5">
                  <Utensils className="h-3 w-3" />
                  {r.cuisine}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-gold">
                  <Star className="h-3 w-3 fill-gold" />
                  {r.rating ? Number(r.rating).toFixed(1) : "—"}
                </span>
                <span className="text-muted-foreground">{r.reviews_count ?? 0} avis</span>
                {r.is_open === false && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                    Fermé
                  </span>
                )}
              </div>

              <div className="mt-auto space-y-2 pt-4">
                <button
                  onClick={() => openDetails(r.id)}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/50 text-xs font-semibold text-foreground transition hover:bg-background"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir détails & documents
                </button>
                {r.is_active ? (
                  <button
                    onClick={() => updateStatus(r, false)}
                    disabled={busy}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                    Désactiver
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(r, true)}
                    disabled={busy}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-xs font-semibold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    Approuver et publier
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {list && filtered.length === 0 && (
        <p className="rounded-3xl border border-dashed border-border bg-surface/30 p-10 text-center text-sm text-muted-foreground">
          Aucun restaurant ne correspond à ce filtre.
        </p>
      )}

      {openId && (
        <DetailsModal
          loading={detailsLoading}
          details={details}
          onClose={() => { setOpenId(null); setDetails(null); }}
        />
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value ?? <span className="text-muted-foreground">—</span>}</p>
      </div>
    </div>
  );
}

function DocBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-gold/40 bg-gold/10 text-gold"}`}>
      {ok ? <FileCheck2 className="h-4 w-4" /> : <FileX2 className="h-4 w-4" />}
      {label}
    </div>
  );
}

function DetailsModal({ loading, details, onClose, onSaved }: { loading: boolean; details: Details; onClose: () => void; onSaved?: (lat: number, lng: number) => void }) {
  const r = details?.restaurant;
  const owner = details?.owner;
  const hasCover = !!r?.cover_url;
  const hasLogo = !!r?.image_url;
  const baseLat = r?.lat ? Number(r.lat) : null;
  const baseLng = r?.lng ? Number(r.lng) : null;
  const hasGeo = baseLat !== null && baseLng !== null;
  const hasHours = r?.opening_hours && Object.keys(r.opening_hours).length > 0;

  const updateLoc = useServerFn(updateRestaurantLocation);
  const [editing, setEditing] = useState(false);
  const [lat, setLat] = useState<number | null>(baseLat);
  const [lng, setLng] = useState<number | null>(baseLng);
  const [saving, setSaving] = useState(false);

  // Reset local state when restaurant changes
  useEffect(() => {
    setEditing(false);
    setLat(baseLat);
    setLng(baseLng);
  }, [r?.id, baseLat, baseLng]);

  const dirty = editing && lat !== null && lng !== null && (lat !== baseLat || lng !== baseLng);

  const save = async () => {
    if (!r || lat === null || lng === null) return;
    setSaving(true);
    try {
      await updateLoc({ data: { id: r.id, lat, lng } });
      toast.success("Coordonnées mises à jour");
      setEditing(false);
      onSaved?.(lat, lng);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    if (!hasGeo) {
      // Fallback : centre Douala par défaut
      setLat(4.0511);
      setLng(9.7679);
    }
    setEditing(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-surface shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        {loading || !r ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {/* Cover + identité */}
            <div className="overflow-hidden rounded-2xl border border-border">
              {r.cover_url ? (
                <img src={r.cover_url} alt={r.name} className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-gradient-primary/20 text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="flex items-center gap-4 p-4">
                {r.image_url ? (
                  <img src={r.image_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary">
                    <Store className="h-6 w-6 text-primary-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl font-bold">{r.name}</h2>
                  <p className="text-xs text-muted-foreground">{r.cuisine} · {r.city}{r.neighborhood ? ` · ${r.neighborhood}` : ""}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${r.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-gold/15 text-gold"}`}>
                  {r.is_active ? "Actif" : "En attente"}
                </span>
              </div>
            </div>

            {/* Vérification documents */}
            <div>
              <h3 className="mb-2 text-sm font-bold">Documents & vérification</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DocBadge ok={!!r.owner_id} label="Propriétaire lié" />
                <DocBadge ok={hasLogo} label="Logo" />
                <DocBadge ok={hasCover} label="Couverture" />
                <DocBadge ok={hasGeo} label="Géolocalisation" />
                <DocBadge ok={!!r.address} label="Adresse" />
                <DocBadge ok={!!hasHours} label="Horaires" />
                <DocBadge ok={(details?.stats.dishes ?? 0) > 0} label={`${details?.stats.dishes ?? 0} plats`} />
                <DocBadge ok={r.is_open !== false} label={r.is_open === false ? "Fermé" : "Ouvert"} />
              </div>
            </div>

            {/* Coordonnées propriétaire */}
            <div>
              <h3 className="mb-2 text-sm font-bold">Coordonnées du propriétaire</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <Row icon={User} label="Nom" value={owner?.full_name ?? "—"} />
                <Row icon={Phone} label="Téléphone" value={owner?.phone ?? "—"} />
                <Row icon={MapPin} label="Ville" value={owner?.city ?? "—"} />
                <Row icon={Hash} label="Owner ID" value={r.owner_id ? <code className="text-[11px]">{r.owner_id}</code> : "—"} />
              </div>
            </div>

            {/* Adresse & géo */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">Adresse & localisation</h3>
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-background"
                  >
                    <Pencil className="h-3 w-3" />
                    Modifier la position
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditing(false); setLat(baseLat); setLng(baseLng); }}
                      className="rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-background"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={save}
                      disabled={!dirty || saving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Row icon={MapPin} label="Adresse" value={r.address ?? "—"} />
                <Row icon={MapPin} label="Ville / Quartier" value={`${r.city}${r.neighborhood ? ` · ${r.neighborhood}` : ""}`} />
                <Row icon={Hash} label="Latitude" value={lat !== null ? lat.toFixed(6) : "—"} />
                <Row icon={Hash} label="Longitude" value={lng !== null ? lng.toFixed(6) : "—"} />
              </div>
              {(hasGeo || editing) && lat !== null && lng !== null ? (
                <div className="mt-3">
                  {editing && (
                    <p className="mb-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                      <Crosshair className="h-3 w-3" />
                      Glissez le marqueur ou cliquez sur la carte pour repositionner.
                    </p>
                  )}
                  <RestaurantMap
                    lat={lat}
                    lng={lng}
                    name={r.name}
                    editable={editing}
                    onChange={(la, ln) => { setLat(la); setLng(ln); }}
                  />
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    Ouvrir dans OpenStreetMap ↗
                  </a>
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border bg-background/30 p-4 text-center text-xs text-muted-foreground">
                  Aucune géolocalisation enregistrée. Cliquez « Modifier la position » pour la définir.
                </p>
              )}
            </div>

            {/* Métriques opérationnelles */}
            <div>
              <h3 className="mb-2 text-sm font-bold">Opérations</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <Row icon={Clock} label="ETA livraison" value={`${r.eta_min ?? "—"}–${r.eta_max ?? "—"} min`} />
                <Row icon={Utensils} label="Frais de livraison" value={`${r.delivery_fee ?? 0} FCFA`} />
                <Row icon={Hash} label="Min. commande" value={`${r.min_order ?? 0} FCFA`} />
                <Row icon={Star} label="Note" value={`${r.rating ?? "—"} (${r.reviews_count ?? 0} avis)`} />
                <Row icon={Hash} label="Slug" value={r.slug} />
                <Row icon={Hash} label="Commandes total" value={details?.stats.orders ?? 0} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
