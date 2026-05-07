import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Clock, CheckCircle2, ChevronRight, MapPin, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyOrders } from "@/server/marketplace.functions";
import { RowSkeleton, EmptyState } from "@/components/ui/feedback";

export const Route = createFileRoute("/commandes")({
  head: () => ({
    meta: [
      { title: "Mes commandes — MboaEats" },
      { name: "description", content: "Historique et suivi de vos commandes." },
    ],
  }),
  component: CommandesPage,
});

type Order = {
  id: string;
  reference: string;
  status: string;
  total: number;
  eta_minutes: number | null;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
  restaurant: { name: string; image_url: string | null; slug: string } | null;
};

const ACTIVE = new Set([
  "pending_payment", "paid", "accepted", "preparing", "ready", "picked_up", "delivering",
]);

function statusLabel(s: string) {
  return ({
    pending_payment: "À payer",
    paid: "Payée",
    accepted: "Acceptée",
    preparing: "En préparation",
    ready: "Prête",
    picked_up: "Récupérée",
    delivering: "En livraison",
    delivered: "Livrée",
    cancelled: "Annulée",
    refunded: "Remboursée",
  } as Record<string, string>)[s] ?? s;
}

function CommandesPage() {
  const [tab, setTab] = useState<"all" | "active" | "delivered">("all");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthed(!!user);
      if (!user) { setOrders([]); return; }
      try {
        const r = await getMyOrders();
        if (mounted) setOrders((r as { orders: Order[] }).orders);
      } catch { if (mounted) setOrders([]); }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = (orders ?? []).filter((o) =>
    tab === "all" ? true : tab === "active" ? ACTIVE.has(o.status) : o.status === "delivered"
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-4">
          <h1 className="font-display text-xl font-bold">Mes commandes</h1>
          <div className="mt-3 flex gap-2">
            {[
              { k: "all", l: "Toutes" },
              { k: "active", l: "En cours" },
              { k: "delivered", l: "Livrées" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as typeof tab)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t.k
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "border border-border bg-surface/60 text-muted-foreground"
                }`}
              >{t.l}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        {authed === false ? (
          <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
            <LogIn className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Connectez-vous pour voir vos commandes.</p>
            <Link to="/connexion" className="mt-4 inline-block rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
              Se connecter
            </Link>
          </div>
        ) : orders === null ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i}><RowSkeleton /></li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Pas encore de commande"
            description="Découvrez nos restos et passez votre première commande en quelques tapes."
            action={{ label: "Découvrir les restos", to: "/decouvrir" }}
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => {
              const active = ACTIVE.has(o.status);
              return (
                <li key={o.id} className="rounded-2xl border border-border bg-surface/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("fr-FR")} · #{o.reference}
                      </p>
                      <p className="mt-0.5 truncate font-semibold">{o.restaurant?.name ?? "Restaurant"}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {o.total.toLocaleString("fr-FR")} FCFA
                    </span>
                    {active ? (
                      <Link
                        to="/suivi/$orderId"
                        params={{ orderId: o.id }}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                      >
                        <MapPin className="h-3.5 w-3.5" /> Suivre
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                        Recommander →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "delivered")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Livrée
      </span>
    );
  if (status === "cancelled" || status === "refunded")
    return <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">{statusLabel(status)}</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary">
      <Clock className="h-3 w-3 animate-pulse" /> {statusLabel(status)}
    </span>
  );
}
