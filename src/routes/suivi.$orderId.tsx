import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, ChefHat, Package, Truck, Home,
  MapPin, ArrowLeft, Phone, MessageCircle, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrder } from "@/server/marketplace.functions";
import { useRealtimeOrder } from "@/hooks/use-realtime-order";
import { ReviewForm } from "@/components/ReviewForm";

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
    <div className="p-8 text-center text-sm" style={{ color: "#888888" }}>
      {error.message}
      <div className="mt-3">
        <Link to="/commandes" className="font-semibold" style={{ color: "#2D5A27" }}>
          Retour aux commandes
        </Link>
      </div>
    </div>
  ),
});

const STEPS = [
  { key: "preparing", label: "En préparation", desc: "Le resto cuisine votre commande", icon: ChefHat },
  { key: "ready", label: "Envoyé", desc: "Prête à être récupérée", icon: Package },
  { key: "picked_up", label: "En route", desc: "Le livreur arrive vers vous", icon: Truck },
  { key: "delivered", label: "Livré", desc: "Bon appétit !", icon: Home },
] as const;

const STATUS_INDEX: Record<string, number> = {
  pending_payment: -1, paid: 0, accepted: 0, preparing: 0,
  ready: 1, picked_up: 2, delivering: 2, delivered: 3,
};

type OrderItem = { id: string; name: string; qty: number; unit_price: number; line_total: number };

function SuiviPage() {
  const data = Route.useLoaderData() as {
    order: Record<string, unknown> & {
      id: string; restaurant_id: string; status: string; subtotal: number;
      delivery_fee: number; promo_code: string | null; promo_discount: number;
      total: number; eta_minutes: number | null; paid_at: string | null;
      delivered_at: string | null; reference: string; driver_id: string | null;
      restaurant?: { name?: string } | null;
      delivery_address?: { line?: string; city?: string } | null;
    };
    items: OrderItem[];
  };
  const { order: live } = useRealtimeOrder(data.order.id);
  const order = { ...data.order, ...(live ?? {}) };
  const stepIdx = STATUS_INDEX[order.status] ?? -1;
  const currentStep = STEPS[Math.max(0, Math.min(stepIdx, STEPS.length - 1))];

  const etaTarget = useMemo(() => {
    if (order.delivered_at || !order.paid_at || !order.eta_minutes) return null;
    return new Date(order.paid_at).getTime() + order.eta_minutes * 60_000;
  }, [order.paid_at, order.eta_minutes, order.delivered_at]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remainingMs = etaTarget ? Math.max(0, etaTarget - now) : 0;
  const minutes = Math.floor(remainingMs / 60000);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "#F5F0E8" }}>
      {/* Map area */}
      <div className="relative h-[42vh] min-h-[280px] overflow-hidden">
        <FauxMap progress={Math.min(1, (stepIdx + 1) / STEPS.length)} />

        {/* Top bar overlay */}
        <div className="absolute inset-x-0 top-0 z-20 px-4 pt-4">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <Link
              to="/commandes"
              aria-label="Retour"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
            >
              <ArrowLeft className="h-5 w-5" style={{ color: "#1A1A1A" }} />
            </Link>
            <div className="rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-md" style={{ color: "#1A1A1A" }}>
              #{order.reference}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="relative -mt-6 mx-auto max-w-md px-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.15)]">
          {/* ETA hero */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888888" }}>
              {order.delivered_at ? "Commande livrée" : "Arrivée estimée"}
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: "#1A1A1A" }}>
              {order.delivered_at ? "✓" : etaTarget ? `${minutes} min` : "—"}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "#2D5A27" }}>
              {currentStep.label} · {currentStep.desc}
            </p>
          </div>

          {/* Step pills */}
          <div className="mt-5 flex items-center justify-between">
            {STEPS.map((s, i) => {
              const reached = i <= stepIdx;
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div
                        className="h-1 flex-1 rounded-full"
                        style={{ backgroundColor: i <= stepIdx ? "#2D5A27" : "#E5E5E5" }}
                      />
                    )}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: reached ? "#2D5A27" : "#F4F4F4",
                        color: reached ? "#FFFFFF" : "#AAAAAA",
                      }}
                    >
                      {reached && i < stepIdx ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className="h-1 flex-1 rounded-full"
                        style={{ backgroundColor: i < stepIdx ? "#2D5A27" : "#E5E5E5" }}
                      />
                    )}
                  </div>
                  <span
                    className="mt-1.5 text-[10px] font-semibold"
                    style={{ color: reached ? "#1A1A1A" : "#AAAAAA" }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver card */}
        {stepIdx >= 2 && !order.delivered_at && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.1)]">
            <div className="relative">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: "#2D5A27" }}
              >
                {(order.driver_id ?? "M").slice(0, 1).toUpperCase()}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white"
              >
                <Truck className="h-2.5 w-2.5" style={{ color: "#2D5A27" }} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
                Votre livreur
              </p>
              <p className="flex items-center gap-1 text-xs" style={{ color: "#888888" }}>
                <Star className="h-3 w-3 fill-current" style={{ color: "#FFC107" }} />
                <span className="font-semibold" style={{ color: "#1A1A1A" }}>4.9</span>
                · Moto · CM-{(order.driver_id ?? "0000").slice(0, 4).toUpperCase()}
              </p>
            </div>
            <button
              aria-label="Envoyer un message"
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F4F4F4" }}
            >
              <MessageCircle className="h-5 w-5" style={{ color: "#1A1A1A" }} />
            </button>
            <button
              aria-label="Appeler le livreur"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: "#2D5A27" }}
            >
              <Phone className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Address */}
        {order.delivery_address && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)]">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F5F0E8" }}
            >
              <MapPin className="h-4 w-4" style={{ color: "#2D5A27" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold" style={{ color: "#888888" }}>
                Livraison à
              </p>
              <p className="truncate text-sm font-bold" style={{ color: "#1A1A1A" }}>
                {order.delivery_address.line}
              </p>
              <p className="truncate text-xs" style={{ color: "#888888" }}>
                {order.delivery_address.city}
              </p>
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
              {order.restaurant?.name ?? "Votre commande"}
            </h2>
            <span className="text-xs font-semibold" style={{ color: "#888888" }}>
              {data.items.length} article{data.items.length > 1 ? "s" : ""}
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {data.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between">
                <span className="truncate" style={{ color: "#1A1A1A" }}>
                  <span className="font-bold" style={{ color: "#2D5A27" }}>{it.qty}×</span> {it.name}
                </span>
                <span className="tabular-nums" style={{ color: "#888888" }}>
                  {(it.line_total ?? it.unit_price * it.qty).toLocaleString("fr-FR")} F
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t pt-3 text-sm" style={{ borderColor: "#F4F4F4" }}>
            <Row label="Sous-total" value={`${order.subtotal.toLocaleString("fr-FR")} F`} />
            <Row label="Livraison" value={`${order.delivery_fee.toLocaleString("fr-FR")} F`} />
            {order.promo_discount > 0 && (
              <Row label={`Promo ${order.promo_code ?? ""}`} value={`-${order.promo_discount.toLocaleString("fr-FR")} F`} accent />
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold" style={{ color: "#1A1A1A" }}>Total payé</span>
              <span className="text-base font-bold tabular-nums" style={{ color: "#1A1A1A" }}>
                {order.total.toLocaleString("fr-FR")} F
              </span>
            </div>
          </div>
        </div>

        {order.delivered_at && (
          <div className="mt-3">
            <ReviewForm restaurantId={order.restaurant_id} orderId={order.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: accent ? "#2D5A27" : "#888888" }}>{label}</span>
      <span className="tabular-nums" style={{ color: accent ? "#2D5A27" : "#1A1A1A" }}>{value}</span>
    </div>
  );
}

/* Stylized SVG map (no API key needed). Animated dashed route line + driver pin moving along progress. */
function FauxMap({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0" style={{ backgroundColor: "#EBE3D5" }}>
      <svg viewBox="0 0 400 320" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {/* Soft grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CFE0CC" strokeWidth="1" />
          </pattern>
          <linearGradient id="route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2D5A27" />
            <stop offset="100%" stopColor="#2D5A27" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect width="400" height="320" fill="url(#grid)" />

        {/* Roads */}
        <path d="M 0 220 Q 80 200 160 210 T 320 180 T 400 160" stroke="#FFFFFF" strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d="M 60 0 L 80 80 L 120 140 L 200 180 L 280 200 L 360 320" stroke="#FFFFFF" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.85" />

        {/* Buildings */}
        <g fill="#CFE0CC">
          <rect x="20" y="60" width="40" height="50" rx="4" />
          <rect x="240" y="40" width="60" height="70" rx="4" />
          <rect x="320" y="220" width="50" height="60" rx="4" />
          <rect x="40" y="250" width="70" height="50" rx="4" />
        </g>

        {/* Route */}
        <path
          d="M 50 80 C 120 100, 160 180, 240 200 S 340 240, 360 270"
          stroke="url(#route)"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="10 8"
        />

        {/* Restaurant pin */}
        <g transform="translate(50,80)">
          <circle r="14" fill="#FFFFFF" />
          <circle r="9" fill="#1A1A1A" />
          <text textAnchor="middle" y="4" fontSize="11" fill="#FFFFFF">🍴</text>
        </g>

        {/* Destination pin */}
        <g transform="translate(360,270)">
          <circle r="16" fill="#2D5A27" />
          <circle r="6" fill="#FFFFFF" />
        </g>

        {/* Driver marker, position along progress */}
        <DriverMarker progress={progress} />
      </svg>
      {/* Top fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/15 to-transparent" />
    </div>
  );
}

function DriverMarker({ progress }: { progress: number }) {
  // Sample point along the curved route (approximate Bezier)
  const t = Math.max(0, Math.min(1, progress));
  const p0 = { x: 50, y: 80 };
  const p1 = { x: 120, y: 100 };
  const p2 = { x: 160, y: 180 };
  const p3 = { x: 240, y: 200 };
  const p4 = { x: 340, y: 240 };
  const p5 = { x: 360, y: 270 };
  // Piecewise linear sampling for simplicity
  const pts = [p0, p1, p2, p3, p4, p5];
  const segIdx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
  const segT = t * (pts.length - 1) - segIdx;
  const a = pts[segIdx];
  const b = pts[segIdx + 1];
  const x = a.x + (b.x - a.x) * segT;
  const y = a.y + (b.y - a.y) * segT;
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="18" fill="#2D5A27" opacity="0.2">
        <animate attributeName="r" from="18" to="28" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle r="12" fill="#FFFFFF" stroke="#2D5A27" strokeWidth="3" />
      <text textAnchor="middle" y="4" fontSize="12">🛵</text>
    </g>
  );
}
