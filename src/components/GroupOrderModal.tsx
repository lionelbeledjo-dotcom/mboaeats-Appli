import { useState } from "react";
import { X, Copy, Check, Users, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  restoId: string;
  restoName: string;
  onClose: () => void;
};

export function GroupOrderModal({ restoId, restoName, onClose }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const createGroup = async () => {
    setCreating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { toast.error("Connectez-vous pour créer un groupe"); return; }
      const groupId = crypto.randomUUID().slice(0, 8);
      const groupLink = `${window.location.origin}/restaurants/${restoId}?group=${groupId}`;
      localStorage.setItem(`mboa_group_${groupId}`, JSON.stringify({
        owner: user.user.id,
        restoId,
        restoName,
        created: Date.now(),
        members: [{ id: user.user.id, name: "Vous" }],
      }));
      setLink(groupLink);
    } catch {
      toast.error("Erreur lors de la création du groupe");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#06C167]/10">
            <Users className="h-6 w-6 text-[#06C167]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Commande groupée</h2>
            <p className="text-xs text-gray-500">Invitez vos amis à ajouter des plats</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              Partagez un lien avec vos amis pour qu'ils ajoutent leurs plats au panier commun chez <span className="font-semibold">{restoName}</span>.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-gray-500">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06C167]/10 text-[10px] font-bold text-[#06C167]">1</span>
                Créez le lien de groupe
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06C167]/10 text-[10px] font-bold text-[#06C167]">2</span>
                Partagez-le à vos amis
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06C167]/10 text-[10px] font-bold text-[#06C167]">3</span>
                Chacun ajoute ses plats, vous payez
              </li>
            </ul>
          </div>

          {!link ? (
            <button
              onClick={createGroup}
              disabled={creating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-4 text-sm font-bold text-white disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {creating ? "Création..." : "Créer un lien de groupe"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3">
                <span className="flex-1 truncate text-xs text-gray-600">{link}</span>
                <button
                  onClick={copyLink}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06C167] text-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {typeof navigator.share === "function" && (
                <button
                  onClick={() => navigator.share({ title: `Commande groupée — ${restoName}`, url: link })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-800"
                >
                  Partager via...
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
