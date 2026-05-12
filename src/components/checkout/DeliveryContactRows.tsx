import { useMemo, useState } from "react";
import { MapPin, DoorOpen, Phone, ChevronRight, Check, X } from "lucide-react";
import { z } from "zod";

export const deliveryContactSchema = z.object({
  address: z
    .string()
    .trim()
    .min(8, "Adresse trop courte (min. 8 caractères)")
    .max(200, "Adresse trop longue (max. 200)"),
  instructions: z
    .string()
    .trim()
    .min(3, "Précisez une instruction (min. 3 caractères)")
    .max(200, "Trop long (max. 200)"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?237)?[\s.-]?[26][0-9]{8}$/, "Numéro camerounais invalide (ex: 690 00 00 00)"),
});

export type DeliveryContact = z.infer<typeof deliveryContactSchema>;
export type DeliveryContactErrors = Partial<Record<keyof DeliveryContact, string>>;

export function validateDeliveryContact(v: DeliveryContact): DeliveryContactErrors {
  const r = deliveryContactSchema.safeParse(v);
  if (r.success) return {};
  const errs: DeliveryContactErrors = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof DeliveryContact;
    if (!errs[k]) errs[k] = issue.message;
  }
  return errs;
}

type RowKey = "address" | "instructions" | "phone";

export function DeliveryContactRows({
  value,
  onChange,
  errors,
}: {
  value: DeliveryContact;
  onChange: (v: DeliveryContact) => void;
  errors?: DeliveryContactErrors;
}) {
  const [editing, setEditing] = useState<RowKey | null>(null);
  const [draft, setDraft] = useState("");

  const rows: { key: RowKey; icon: React.ReactNode; title: string; placeholder: string; subtitle?: string }[] = useMemo(
    () => [
      {
        key: "address",
        icon: <MapPin className="h-5 w-5" strokeWidth={2.25} />,
        title: value.address || "Adresse de livraison",
        placeholder: "Rue, immeuble, ville…",
        subtitle: value.address ? "Adresse" : "Ajoutez une adresse de livraison",
      },
      {
        key: "instructions",
        icon: <DoorOpen className="h-5 w-5" strokeWidth={2.25} />,
        title: value.instructions || "Rendez-vous devant ma porte",
        placeholder: "Ex: 3e étage, sonner deux fois…",
        subtitle: "Photos et instructions de livraison",
      },
      {
        key: "phone",
        icon: <Phone className="h-5 w-5" strokeWidth={2.25} />,
        title: value.phone || "Numéro de téléphone",
        placeholder: "+237 6XX XX XX XX",
        subtitle: value.phone ? "Téléphone du destinataire" : "Pour joindre le livreur",
      },
    ],
    [value],
  );

  const open = (key: RowKey) => {
    setDraft(value[key] ?? "");
    setEditing(key);
  };
  const close = () => setEditing(null);
  const save = () => {
    if (!editing) return;
    onChange({ ...value, [editing]: draft.trim() });
    setEditing(null);
  };

  return (
    <div className="rounded-3xl bg-white">
      <ul className="divide-y divide-gray-100">
        {rows.map((r) => {
          const err = errors?.[r.key];
          const filled = !!value[r.key];
          return (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => open(r.key)}
                className="flex w-full items-start gap-3 px-4 py-4 text-left active:bg-gray-50 transition-colors"
              >
                <span className={`mt-0.5 ${err ? "text-red-500" : "text-black"}`}>{r.icon}</span>
                <span className="flex-1 min-w-0">
                  <span
                    className={`block text-[15px] font-bold leading-snug truncate ${
                      filled ? "text-black" : "text-gray-400"
                    }`}
                  >
                    {r.title}
                  </span>
                  {r.subtitle && (
                    <span className={`block text-[13px] mt-0.5 ${
                      r.key === "instructions" && filled ? "text-emerald-600 font-medium" : "text-gray-500"
                    }`}>
                      {r.subtitle}
                    </span>
                  )}
                  {err && (
                    <span className="block text-[12px] text-red-500 mt-1 font-medium">{err}</span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 text-gray-400 mt-1 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>

      {editing && (
        <EditSheet
          title={
            editing === "address"
              ? "Adresse de livraison"
              : editing === "instructions"
                ? "Instructions de livraison"
                : "Numéro de téléphone"
          }
          placeholder={rows.find((r) => r.key === editing)!.placeholder}
          value={draft}
          onChange={setDraft}
          inputMode={editing === "phone" ? "tel" : "text"}
          maxLength={editing === "phone" ? 20 : 200}
          onCancel={close}
          onSave={save}
        />
      )}
    </div>
  );
}

function EditSheet({
  title,
  placeholder,
  value,
  onChange,
  onCancel,
  onSave,
  inputMode,
  maxLength,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  inputMode?: "text" | "tel";
  maxLength?: number;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-bold text-black">{title}</h3>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onCancel}
            className="p-1 -mr-1 active:scale-95 transition-transform"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        </div>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-[15px] text-black outline-none focus:border-black"
        />
        <button
          type="button"
          onClick={onSave}
          className="mt-4 flex w-full h-12 items-center justify-center gap-2 rounded-2xl bg-black text-white text-[15px] font-semibold active:scale-[0.98] transition-transform"
        >
          <Check className="h-4 w-4" /> Enregistrer
        </button>
      </div>
    </div>
  );
}
