import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Clock, Bike, Plus, Check, Home, Briefcase, ChevronRight, LocateFixed, Loader2 } from "lucide-react";
import { listMyAddresses, upsertMyAddress } from "@/server/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DeliveryAddress = {
  id?: string;
  label?: string;
  line: string;
  city: string;
  neighborhood?: string | null;
};

export type DeliverySchedule =
  | { type: "now" }
  | { type: "scheduled"; when: string /* ISO */ };

export type DeliveryDetailsState = {
  address: DeliveryAddress;
  schedule: DeliverySchedule;
  instructions: string;
};

const PRESETS = [
  "Sonner à la porte",
  "Laisser devant la porte",
  "Appeler en arrivant",
  "Ne pas sonner (bébé qui dort)",
  "Remettre au gardien",
];

export function DeliveryDetails({
  value,
  onChange,
  error,
}: {
  value: DeliveryDetailsState;
  onChange: (v: DeliveryDetailsState) => void;
  error?: string | null;
}) {
  const listFn = useServerFn(listMyAddresses);
  const upsertFn = useServerFn(upsertMyAddress);

  const [authed, setAuthed] = useState(false);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<DeliveryAddress>({
    label: "Maison",
    line: "",
    city: "Douala",
    neighborhood: "",
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Géolocalisation non supportée par votre navigateur");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocoding via OpenStreetMap Nominatim (gratuit, sans clé)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fr&zoom=18`,
            { headers: { "Accept": "application/json" } },
          );
          if (!res.ok) throw new Error("reverse-failed");
          const data = await res.json();
          const a = data.address ?? {};
          const line: string =
            data.display_name?.split(",").slice(0, 3).join(",").trim() ||
            [a.road, a.house_number].filter(Boolean).join(" ") ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          const city: string =
            a.city || a.town || a.village || a.municipality || a.county || draft.city || "Douala";
          const neighborhood: string =
            a.suburb || a.neighbourhood || a.quarter || a.city_district || draft.neighborhood || "";
          setShowNew(true);
          setDraft((d) => ({
            ...d,
            line,
            city,
            neighborhood,
          }));
          toast.success("Position détectée — vérifiez l'adresse");
        } catch {
          setShowNew(true);
          setDraft((d) => ({
            ...d,
            line: `Position GPS : ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          }));
          toast.message("Position captée — précisez le repère manuellement");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Autorisation refusée — activez la localisation dans le navigateur"
            : err.code === err.TIMEOUT
              ? "Délai dépassé — réessayez"
              : "Impossible d'obtenir votre position";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAuthed(true);
      try {
        const r = await listFn();
        setAddresses(r.addresses as DeliveryAddress[]);
        if (!value.address.line && r.addresses?.length) {
          const def = r.addresses.find((a) => a.is_default === true) ?? r.addresses[0];
          onChange({ ...value, address: def as DeliveryAddress });
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveNew = async () => {
    if (draft.line.trim().length < 8) {
      toast.error("Adresse trop courte (≥ 8 caractères)");
      return;
    }
    setSaving(true);
    try {
      if (authed) {
        const res = await upsertFn({ data: { ...draft, line: draft.line.trim() } });
        const saved: DeliveryAddress = { ...draft, id: res.id };
        setAddresses((a) => [saved, ...a]);
        onChange({ ...value, address: saved });
        toast.success("Adresse enregistrée");
      } else {
        onChange({ ...value, address: draft });
      }
      setShowNew(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const togglePreset = (p: string) => {
    const has = value.instructions.includes(p);
    const next = has
      ? value.instructions.replace(new RegExp(`(, )?${p}`), "").replace(/^, /, "")
      : value.instructions
        ? `${value.instructions}, ${p}`
        : p;
    onChange({ ...value, instructions: next });
  };

  const isScheduled = value.schedule.type === "scheduled";
  const minDateTime = (() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  })();

  return (
    <div className="rounded-3xl border border-border bg-card p-5 space-y-5">
      {/* Address */}
      <div>
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <MapPin className="h-4 w-4 text-[#06C167]" /> Adresse de livraison
        </h2>

        {addresses.length > 0 && (
          <div className="mt-3 space-y-2">
            {addresses.map((a) => {
              const active = value.address.id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onChange({ ...value, address: a })}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-[#06C167] bg-[#06C167]/5"
                      : "border-border hover:border-[#06C167]/40"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {(a.label || "").toLowerCase().includes("trav") ? (
                      <Briefcase className="h-4 w-4" />
                    ) : (
                      <Home className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{a.label || "Adresse"}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.line}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[a.neighborhood, a.city].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06C167] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!showNew ? (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-[#06C167] hover:text-[#06C167]"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une nouvelle adresse
          </button>
        ) : (
          <div className="mt-3 space-y-2 rounded-2xl border border-border bg-background p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={draft.label ?? ""}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Libellé (Maison)"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#06C167]"
              />
              <input
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="Ville"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#06C167]"
              />
            </div>
            <input
              value={draft.neighborhood ?? ""}
              onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value })}
              placeholder="Quartier (Bonapriso, Akwa…)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#06C167]"
            />
            <textarea
              value={draft.line}
              onChange={(e) => setDraft({ ...draft, line: e.target.value })}
              placeholder="Adresse complète + repère visible (ex : derrière la station Total, portail bleu)"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#06C167]"
            />
            <p className="text-[10px] text-muted-foreground">
              💡 Géolocalisation Google Maps disponible bientôt — pour l'instant, décris bien le repère.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveNew}
                className="flex-1 rounded-xl bg-[#06C167] py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? "…" : "Utiliser cette adresse"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>
        )}
      </div>

      {/* Schedule */}
      <div>
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <Clock className="h-4 w-4 text-[#06C167]" /> Heure de livraison
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, schedule: { type: "now" } })}
            className={`rounded-2xl border p-3 text-left transition ${
              !isScheduled
                ? "border-[#06C167] bg-[#06C167]/5"
                : "border-border hover:border-[#06C167]/40"
            }`}
          >
            <p className="text-sm font-bold">⚡ Maintenant</p>
            <p className="text-[11px] text-muted-foreground">≈ 30 min</p>
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                schedule: { type: "scheduled", when: minDateTime },
              })
            }
            className={`rounded-2xl border p-3 text-left transition ${
              isScheduled
                ? "border-[#06C167] bg-[#06C167]/5"
                : "border-border hover:border-[#06C167]/40"
            }`}
          >
            <p className="text-sm font-bold">📅 Programmer</p>
            <p className="text-[11px] text-muted-foreground">Choisir l'heure</p>
          </button>
        </div>
        {isScheduled && (
          <input
            type="datetime-local"
            min={minDateTime}
            value={value.schedule.type === "scheduled" ? value.schedule.when : ""}
            onChange={(e) =>
              onChange({ ...value, schedule: { type: "scheduled", when: e.target.value } })
            }
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#06C167]"
          />
        )}
      </div>

      {/* Instructions */}
      <div>
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <Bike className="h-4 w-4 text-[#06C167]" /> Instructions livreur
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = value.instructions.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePreset(p)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-[#06C167] bg-[#06C167]/10 text-[#06C167]"
                    : "border-border bg-background text-muted-foreground hover:border-[#06C167]/40"
                }`}
              >
                {active && <Check className="mr-1 inline h-3 w-3" />}
                {p}
              </button>
            );
          })}
        </div>
        <textarea
          value={value.instructions}
          onChange={(e) =>
            onChange({ ...value, instructions: e.target.value.slice(0, 200) })
          }
          rows={2}
          placeholder="Note libre pour le livreur (étage, code, signe distinctif…)"
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#06C167]"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {value.instructions.length}/200
        </p>
      </div>
    </div>
  );
}
