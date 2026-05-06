import { createFileRoute } from "@tanstack/react-router";
import { Bike, Star, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/admin/livreurs")({
  component: Livreurs,
});

const data = [
  { name: "Junior K.", city: "Douala", rating: 4.92, courses: 127, status: "En course", earned: 47200 },
  { name: "Aïssa M.", city: "Douala", rating: 4.88, courses: 98, status: "En ligne", earned: 38500 },
  { name: "Patrick N.", city: "Yaoundé", rating: 4.95, courses: 142, status: "En ligne", earned: 52100 },
  { name: "Florence T.", city: "Bafoussam", rating: 4.81, courses: 64, status: "Hors ligne", earned: 22800 },
  { name: "Eric B.", city: "Douala", rating: 4.72, courses: 89, status: "Hors ligne", earned: 31400 },
];

function Livreurs() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Livreurs</h1>
        <p className="text-sm text-muted-foreground">128 livreurs actifs · 47 en ligne maintenant</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface/60">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Livreur</th>
              <th className="p-4 text-left">Ville</th>
              <th className="p-4 text-right">Note</th>
              <th className="p-4 text-right">Courses (7j)</th>
              <th className="p-4 text-right">Solde</th>
              <th className="p-4 text-center">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((d) => {
              const tone = d.status === "En course" ? "bg-primary/15 text-primary" :
                d.status === "En ligne" ? "bg-emerald-500/15 text-emerald-400" : "bg-surface text-muted-foreground";
              return (
                <tr key={d.name} className="hover:bg-background/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                        <Bike className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="font-semibold">{d.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.city}</span></td>
                  <td className="p-4 text-right"><span className="inline-flex items-center gap-1 text-gold"><Star className="h-3 w-3" /> {d.rating}</span></td>
                  <td className="p-4 text-right">{d.courses}</td>
                  <td className="p-4 text-right font-bold">{d.earned.toLocaleString("fr-FR")} F</td>
                  <td className="p-4 text-center"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{d.status}</span></td>
                  <td className="p-4 text-right">
                    <button className="rounded-lg border border-border bg-background p-1.5 hover:border-primary"><Phone className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
