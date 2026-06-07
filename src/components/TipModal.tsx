import { useState } from "react";
import { X, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIP_OPTIONS = [200, 500, 1000, 2000];

type Props = {
  orderId: string;
  driverId: string;
  driverName: string;
  onClose: () => void;
};

export function TipModal({ orderId, driverId, driverName, onClose }: Props) {
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (amount <= 0) { toast.error("Montant invalide"); return; }
    setSending(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Non connecté");
      await (supabase as any).from("tips").insert({
        order_id: orderId,
        driver_id: driverId,
        user_id: user.user.id,
        amount,
      });
      toast.success(`Merci ! ${amount.toLocaleString("fr-FR")} FCFA envoyés à ${driverName}`);
      onClose();
    } catch {
      toast.error("Erreur lors de l'envoi du pourboire");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#06C167]/10 mb-3">
            <Heart className="h-7 w-7 text-[#06C167]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Pourboire pour {driverName}</h2>
          <p className="mt-1 text-xs text-gray-500">100% du montant va directement au livreur</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {TIP_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { setAmount(opt); setCustom(false); }}
              className="rounded-xl py-3 text-sm font-bold transition"
              style={{
                backgroundColor: !custom && amount === opt ? "#06C167" : "#F4F4F4",
                color: !custom && amount === opt ? "#FFFFFF" : "#1A1A1A",
              }}
            >
              {opt.toLocaleString("fr-FR")}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCustom(true)}
          className="w-full text-center text-xs font-semibold text-[#06C167] mb-3"
        >
          Montant personnalisé
        </button>

        {custom && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-lg font-bold outline-none"
              placeholder="Montant"
              min={0}
            />
            <span className="text-sm font-medium text-gray-500 shrink-0">FCFA</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={sending || amount <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "#06C167" }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Envoyer {amount.toLocaleString("fr-FR")} FCFA
        </button>
      </div>
    </div>
  );
}
