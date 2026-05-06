import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, MessageCircle, Check, X, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/litiges")({
  component: Litiges,
});

const initial = [
  { id: "MBE-2812", client: "Sandra K.", resto: "Chez Mama Biya", motif: "Plat manquant (Eru)", amount: 2500, time: "il y a 12 min", priority: "Haute" },
  { id: "MBE-2798", client: "Eric N.", resto: "Le Wouri Grill", motif: "Livraison tardive (45 min)", amount: 1800, time: "il y a 1h", priority: "Moyenne" },
  { id: "MBE-2785", client: "Christelle M.", resto: "Suya King", motif: "Plat froid à l'arrivée", amount: 1200, time: "il y a 3h", priority: "Basse" },
  { id: "MBE-2772", client: "Hervé F.", resto: "Saveurs du Mboa", motif: "Erreur sur la commande", amount: 3400, time: "il y a 5h", priority: "Haute" },
];

function Litiges() {
  const [items, setItems] = useState(initial);
  const resolve = (id: string) => setItems((s) => s.filter((i) => i.id !== id));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-3">
          Litiges <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400">{items.length}</span>
        </h1>
        <p className="text-sm text-muted-foreground">Réclamations clients à traiter</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => {
          const tone = it.priority === "Haute" ? "border-red-500/40 bg-red-500/5" :
            it.priority === "Moyenne" ? "border-gold/40 bg-gold/5" : "border-border bg-surface/60";
          return (
            <div key={it.id} className={`rounded-3xl border p-5 ${tone}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">#{it.id}</p>
                    <p className="font-display font-bold">{it.motif}</p>
                  </div>
                </div>
                <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase">{it.priority}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-semibold">{it.client}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Restaurant</p>
                  <p className="font-semibold">{it.resto}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Montant en cause</p>
                  <p className="font-bold text-gradient-gold">{it.amount.toLocaleString("fr-FR")} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ouvert</p>
                  <p className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3" /> {it.time}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold hover:bg-surface">
                  <MessageCircle className="h-3.5 w-3.5" /> Contacter
                </button>
                <button onClick={() => resolve(it.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Rembourser
                </button>
                <button onClick={() => resolve(it.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" /> Rejeter
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="md:col-span-2 rounded-3xl border border-dashed border-border bg-surface/30 p-10 text-center">
            <Check className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-2 font-display text-lg font-bold">Aucun litige ouvert 🎉</p>
            <p className="text-sm text-muted-foreground">Tous les clients sont satisfaits pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
