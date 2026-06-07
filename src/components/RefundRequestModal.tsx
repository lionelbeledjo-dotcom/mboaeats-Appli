import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REASONS = [
  "Commande jamais livree",
  "Articles manquants",
  "Nourriture de mauvaise qualite",
  "Mauvaise commande recue",
  "Temps d'attente trop long",
  "Autre",
];

type Props = {
  orderId: string;
  total: number;
  onClose: () => void;
};

export function RefundRequestModal({ orderId, total, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [amount, setAmount] = useState(total);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) { toast.error("Selectionnez un motif"); return; }
    setSending(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Non connecte");
      const { error } = await (supabase as any).from("refunds").insert({
        order_id: orderId,
        user_id: user.user.id,
        amount,
        reason: `${reason}${details ? ` — ${details}` : ""}`,
        status: "pending",
        method: "wallet",
      });
      if (error) throw error;
      toast.success("Demande de remboursement envoyee. Traitement sous 48h.");
      onClose();
    } catch {
      toast.error("Erreur lors de la demande");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "#F4F4F4" }}>
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#FFEBEE" }}>
            <AlertCircle className="h-5 w-5" style={{ color: "#E53935" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#1A1A1A" }}>Demande de remboursement</h2>
            <p className="text-xs" style={{ color: "#6B6B6B" }}>Traitement automatique sous 48h</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#6B6B6B" }}>Motif</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className="rounded-xl px-3 py-2 text-xs font-medium text-left transition"
                  style={{
                    backgroundColor: reason === r ? "#06C167" : "#F5F0E8",
                    color: reason === r ? "#FFFFFF" : "#1A1A1A",
                    border: `1px solid ${reason === r ? "#06C167" : "#E5E5E5"}`,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#6B6B6B" }}>Details (optionnel)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Decrivez le probleme..."
              rows={2}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: "#E5E5E5" }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#6B6B6B" }}>Montant demande</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.min(total, Math.max(0, Number(e.target.value))))}
                className="w-32 rounded-xl border px-3 py-2 text-sm font-bold outline-none"
                style={{ borderColor: "#E5E5E5" }}
              />
              <span className="text-sm" style={{ color: "#6B6B6B" }}>/ {total.toLocaleString("fr-FR")} FCFA max</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border py-3 text-sm font-semibold" style={{ borderColor: "#E5E5E5" }}>
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!reason || sending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#E53935" }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Demander remboursement
          </button>
        </div>
      </div>
    </div>
  );
}
