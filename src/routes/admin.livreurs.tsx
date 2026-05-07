import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, Star, Phone, MapPin, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listAllDrivers } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/livreurs")({
  head: () => ({ meta: [{ title: "Livreurs · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Livreurs,
});

type Driver = {
  id: string; name: string; phone: string | null; city: string | null;
  status: string; lat: number | null; lng: number | null; updated_at: string;
  courses: number; earned: number;
};

function Livreurs() {
  const fetchAll = useServerFn(listAllDrivers);
  const [list, setList] = useState<Driver[] | null>(null);

  useEffect(() => {
    const reload = () => fetchAll().then((r) => setList(r.drivers as Driver[])).catch(() => setList([]));
    reload();
    const ch = supabase
      .channel("admin-drivers")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations" }, () => reload())
      .subscribe();
    const t = setInterval(reload, 15_000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [fetchAll]);

  const online = (list ?? []).filter((d) => d.status !== "offline").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Livreurs</h1>
        <p className="text-sm text-muted-foreground">{(list ?? []).length} livreurs · {online} en ligne en temps réel</p>
      </div>

      {!list && <div className="flex justify-center p-16"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="overflow-hidden rounded-3xl border border-border bg-surface/60">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 text-left">Livreur</th>
              <th className="p-4 text-left">Position</th>
              <th className="p-4 text-right">Courses (7j)</th>
              <th className="p-4 text-right">Gains (7j)</th>
              <th className="p-4 text-center">Statut</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(list ?? []).map((d) => {
              const tone = d.status === "busy" ? "bg-primary/15 text-primary" :
                d.status === "available" ? "bg-emerald-500/15 text-emerald-400" : "bg-surface text-muted-foreground";
              const ago = Math.round((Date.now() - new Date(d.updated_at).getTime()) / 1000);
              const agoStr = ago < 60 ? `${ago}s` : ago < 3600 ? `${Math.round(ago/60)}min` : `${Math.round(ago/3600)}h`;
              return (
                <tr key={d.id} className="hover:bg-background/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
                        <Bike className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.phone ?? "—"} · {d.city ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {d.lat && d.lng ? `${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}` : "—"}
                    </span>
                    <p className="mt-0.5">MAJ il y a {agoStr}</p>
                  </td>
                  <td className="p-4 text-right">{d.courses}</td>
                  <td className="p-4 text-right font-bold">{d.earned.toLocaleString("fr-FR")} F</td>
                  <td className="p-4 text-center"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{d.status}</span></td>
                  <td className="p-4 text-right">
                    {d.phone && (
                      <a href={`tel:${d.phone}`} className="rounded-lg border border-border bg-background p-1.5 hover:border-primary inline-block">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {list && list.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">Aucun livreur enregistré pour l'instant.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
