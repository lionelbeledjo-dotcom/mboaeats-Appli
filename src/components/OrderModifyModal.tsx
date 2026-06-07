import { useState } from "react";
import { X, Plus, Minus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

type Props = {
  orderId: string;
  items: OrderItem[];
  onClose: () => void;
  onUpdated: () => void;
};

export function OrderModifyModal({ orderId, items: initialItems, onClose, onUpdated }: Props) {
  const [items, setItems] = useState(initialItems.map((i) => ({ ...i })));
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta), line_total: Math.max(0, i.qty + delta) * i.unit_price } : i))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const newTotal = items.reduce((sum, i) => sum + i.line_total, 0);
  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

  const save = async () => {
    if (!hasChanges && !note) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("order_modifications").insert({
        order_id: orderId,
        items_snapshot: items,
        note,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Demande de modification envoyee au restaurant");
      onUpdated();
      onClose();
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "#F4F4F4" }}>
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-bold" style={{ color: "#1A1A1A" }}>Modifier la commande</h2>
        <p className="mt-1 text-xs" style={{ color: "#6B6B6B" }}>
          Ajustez les quantites ou retirez des articles. Le restaurant validera la modification.
        </p>

        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <p className="text-center text-sm py-6" style={{ color: "#6B6B6B" }}>
              Aucun article. La commande sera annulee.
            </p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: "#F5F0E8" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#1A1A1A" }}>{item.name}</p>
                <p className="text-xs" style={{ color: "#6B6B6B" }}>{item.unit_price.toLocaleString("fr-FR")} F x {item.qty}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-full border" style={{ borderColor: "#E5E5E5" }}>
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: "#06C167" }}>
                  <Plus className="h-3 w-3 text-white" />
                </button>
                <button onClick={() => removeItem(item.id)} className="ml-1 flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: "#FFEBEE" }}>
                  <Trash2 className="h-3 w-3" style={{ color: "#E53935" }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#6B6B6B" }}>Note au restaurant (optionnel)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: sans piment svp..."
            rows={2}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
            style={{ borderColor: "#E5E5E5" }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: "#F5F0E8" }}>
          <span className="text-sm font-semibold" style={{ color: "#6B6B6B" }}>Nouveau total</span>
          <span className="text-lg font-bold" style={{ color: "#1A1A1A" }}>{newTotal.toLocaleString("fr-FR")} FCFA</span>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border py-3 text-sm font-semibold" style={{ borderColor: "#E5E5E5" }}>
            Annuler
          </button>
          <button
            onClick={save}
            disabled={(!hasChanges && !note) || saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#06C167" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
