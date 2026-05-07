import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Clock, CheckCircle2, ChevronRight, MapPin } from "lucide-react";
import { orders, type Order } from "@/data/orders";

export const Route = createFileRoute("/commandes")({
  head: () => ({
    meta: [
      { title: "Mes commandes — MboaEats" },
      { name: "description", content: "Historique et suivi de vos commandes MboaEats." },
    ],
  }),
  component: CommandesPage,
});

function CommandesPage() {
  const [tab, setTab] = useState<"all" | "en_cours" | "livree">("all");
  const filtered = orders.filter((o) => tab === "all" || o.status === tab);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-4">
          <h1 className="font-display text-xl font-bold">Mes commandes</h1>
          <div className="mt-3 flex gap-2">
            {[
              { k: "all", l: "Toutes" },
              { k: "en_cours", l: "En cours" },
              { k: "livree", l: "Livrées" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as typeof tab)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t.k
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "border border-border bg-surface/60 text-muted-foreground"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Aucune commande pour l'instant</p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
              Découvrir les restos
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => (
              <li key={o.id} className="rounded-2xl border border-border bg-surface/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{o.date} · #{o.id}</p>
                    <p className="mt-0.5 font-semibold">{o.resto}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{o.items.join(" · ")}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{o.total.toLocaleString("fr-FR")} FCFA</span>
                  {o.status === "en_cours" ? (
                    <Link to="/suivi" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                      <MapPin className="h-3.5 w-3.5" /> Suivre · {o.eta}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                      Recommander →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  if (status === "en_cours")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary">
        <Clock className="h-3 w-3 animate-pulse" /> En cours
      </span>
    );
  if (status === "livree")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Livrée
      </span>
    );
  return <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">Annulée</span>;
}
