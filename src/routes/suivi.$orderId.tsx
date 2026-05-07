import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, ChefHat, Clock, CreditCard, Home, MapPin,
  Package, PackageCheck, Truck, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrder } from "@/server/marketplace.functions";
import { useRealtimeOrder } from "@/hooks/use-realtime-order";

export const Route = createFileRoute("/suivi/$orderId")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user)
      throw redirect({ to: "/connexion", search: { next: `/suivi/${params.orderId}` } });
  },
  loader: ({ params }) => getOrder({ data: { id: params.orderId } }),
  head: () => ({
    meta: [
      { title: "Suivi de commande · MboaEats" },
      { name: "description", content: "Suivez votre commande en temps réel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuiviPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-muted-foreground">
      {error.message}
      <div className="mt-3">
        <Link to="/commandes" className="text-primary underline">Retour aux commandes</Link>
      </div>
    </div>
  ),
});

const STEPS = [
  { key: "paid", label: "Paiement reçu", icon: CreditCard },
  { key: "accepted", label: "Resto a accepté", icon: CheckCircle2 },
  { key: "preparing", label: "En préparation", icon: ChefHat },
  { key: "ready", label: "Prête", icon: Package },
  { key: "picked_up", label: "Récupérée", icon: PackageCheck },
  { key: "delivering", label: "En livraison", icon: Truck },
  { key: "delivered", label: "Livrée", icon: Home },
] as const;

const STATUS_INDEX: Record<string, number> = {
  pending_payment: -1, paid: 0, accepted: 1, preparing: 2,
  ready: 3, picked_up: 4, delivering: 5, delivered: 6,
};

type OrderItem = {
  id: string; name: string; qty: number; unit_price: number; line_total: number;
};

function SuiviPage() {
  const data = Route.useLoaderData() as {
    order: Record<string, unknown> & { id: string; status: string; subtotal: number; delivery_fee: number; promo_code: string | null; promo_discount: number; total: number; eta_minutes: number | null; paid_at: string | null; delivered_at: string | null; reference: string; restaurant?: { name?: string } | null; delivery_address?: { line?: string; city?: string } | null };
    items: OrderItem[];
  };
  const { order: live, events } = useRealtimeOrder(data.order.id);
  const order = { ...data.order, ...(live ?? {}) };
  const stepIdx = STATUS_INDEX[order.status] ?? -1;

  const etaTarget = useMemo(() => {
    if (order.delivered_at || !order.paid_at || !order.eta_minutes) return null;
    return new Date(order.paid_at).getTime() + order.eta_minutes * 60_000;
  }, [order.paid_at, order.eta_minutes, order.delivered_at]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") void Notification.requestPermission();
  }, []);

  useEffect(() => {
    const last = events[events.length - 1];
    if (!last) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const titles: Record<string, string> = {
      accepted: "Le restaurant a accepté votre commande",
      preparing: "Votre repas est en préparation",
      ready: "Votre repas est prêt",
      picked_up: "Le livreur a récupéré votre commande",
      delivered: "Votre commande est arrivée 🎉",
    };
    const t = titles[last.event_type];
    if (t) try { new Notification("MboaEats", { body: t }); } catch { /* ignore */ }
  }, [events]);

  const remainingMs = etaTarget ? Math.max(0, etaTarget - now) : 0;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-30 glass border-b border-border/40">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <Link to="/commandes" aria-label="Retour" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/60">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold">
              Commande #{order.reference}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {order.restaurant?.name ?? ""}
            </p>
          </div>
          <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase text-primary">
            {order.status.replace("_", " ")}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4">
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/10 p-5 text-center shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {order.delivered_at ? "Livrée" : "Arrivée estimée"}
          </p>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums">
            {order.delivered_at
              ? "✓"
              : etaTarget
                ? `${minutes}:${seconds.toString().padStart(2, "0")}`
                : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.delivered_at
              ? new Date(order.delivered_at).toLocaleString("fr-FR")
              : etaTarget
                ? "Mise à jour en temps réel"
                : "En attente de validation du resto"}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-surface/60 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étapes</h2>
          <ol className="mt-3 space-y-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const reached = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${reached ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"} ${current ? "animate-pulse" : ""}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`flex-1 text-sm ${reached ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {reached && <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-surface/60 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between">
                <span className="truncate"><span className="font-semibold">{it.qty}× </span>{it.name}</span>
                <span className="tabular-nums">{(it.line_total ?? it.unit_price * it.qty).toLocaleString("fr-FR")} FCFA</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-border/60 pt-3 text-sm">
            <Row label="Sous-total" value={`${order.subtotal.toLocaleString("fr-FR")} FCFA`} />
            <Row label="Livraison" value={`${order.delivery_fee.toLocaleString("fr-FR")} FCFA`} />
            {order.promo_discount > 0 && (
              <Row label={`Promo ${order.promo_code ?? ""}`} value={`-${order.promo_discount.toLocaleString("fr-FR")} FCFA`} accent />
            )}
            <Row label="Total payé" value={`${order.total.toLocaleString("fr-FR")} FCFA`} bold />
          </div>
        </section>

        {order.delivery_address && (
          <section className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-surface/60 p-4">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Adresse de livraison</p>
              <p className="truncate text-muted-foreground">
                {order.delivery_address.line}, {order.delivery_address.city}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={accent ? "text-primary" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold" : ""} ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
