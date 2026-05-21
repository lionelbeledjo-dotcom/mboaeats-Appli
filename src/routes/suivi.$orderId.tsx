import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2, ChefHat, Package, Truck, Home,
  MapPin, ArrowLeft, Phone, MessageCircle, Star, AlertTriangle, X,
  Clock, ShieldCheck, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOrder } from "@/server/marketplace.functions";
import { reportOrderIssue } from "@/server/tracking.functions";
import { useRealtimeOrder } from "@/hooks/use-realtime-order";
import { useDriverLocation } from "@/hooks/use-driver-location";
import { ReviewModal } from "@/components/ReviewModal";
import { OrderChat } from "@/components/OrderChat";
import { getOrderReview } from "@/server/social.functions";

export const Route = createFileRoute("/suivi/$orderId")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user)
      throw redirect({ to: "/connexion", search: { next: `/suivi/${params.orderId}` } });
  },
  loader: async ({ params }) => {
    const result = await getOrder({ data: { id: params.orderId } });
    if (!result.order) throw notFound();
    return result;
  },
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
        <Link to="/commandes" className="font-semibold" style={{ color: "#06C167" }}>
          Retour aux commandes
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#1A1A1A" }}>Commande introuvable</h1>
        <p className="mt-2 text-sm" style={{ color: "#888888" }}>
          Cette commande n'existe pas ou n'est pas associée à votre compte.
        </p>
        <Link to="/commandes" className="mt-4 inline-flex font-semibold" style={{ color: "#06C167" }}>
          Retour aux commandes
        </Link>
      </div>
    </div>
  ),
});

const STEPS = [
  { key: "paid", label: "Commande reçue", desc: "Votre commande est enregistrée", icon: CheckCircle2 },
  { key: "accepted", label: "Acceptée", desc: "Acceptée par le resto", icon: CheckCircle2 },
  { key: "preparing", label: "En préparation", desc: "Le resto cuisine votre commande", icon: ChefHat },
  { key: "ready", label: "Prête", desc: "Prête à être récupérée", icon: Package },
  { key: "picked_up", label: "En route", desc: "Le livreur arrive vers vous", icon: Truck },
  { key: "delivered", label: "Livré", desc: "Bon appétit !", icon: Home },
] as const;

const STATUS_INDEX: Record<string, number> = {
  pending_payment: -1,
  paid: 0,
  accepted: 1,
  preparing: 2,
  in_preparation: 2,
  ready: 3,
  picked_up: 4,
  in_delivery: 4,
  delivering: 4,
  delivered: 5,
};

const STATUS_TOAST: Record<string, { title: string; emoji: string }> = {
  accepted: { title: "Commande acceptée par le restaurant", emoji: "✅" },
  preparing: { title: "Votre commande est en préparation", emoji: "🍳" },
  in_preparation: { title: "Votre commande est en préparation", emoji: "🍳" },
  ready: { title: "Commande prête — un livreur arrive", emoji: "📦" },
  picked_up: { title: "Le livreur est en route !", emoji: "🛵" },
  in_delivery: { title: "Le livreur est en route !", emoji: "🛵" },
  delivering: { title: "Arrivée imminente", emoji: "📍" },
  delivered: { title: "Commande livrée — bon appétit !", emoji: "🎉" },
  cancelled: { title: "Commande annulée", emoji: "❌" },
  rejected: { title: "Commande refusée", emoji: "❌" },
};

type OrderItem = { id: string; name: string; qty: number; unit_price: number; line_total: number };
type DriverInfo = {
  name: string;
  phone: string | null;
  avatar_url: string | null;
  rating?: number | null;
  vehicle_type?: string | null;
};

// Distance haversine en km
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function SuiviPage() {
  const { orderId } = Route.useParams();
  const data = Route.useLoaderData() as {
    order: Record<string, unknown> & {
      id: string; restaurant_id: string; status: string; subtotal: number;
      delivery_fee: number; promo_code: string | null; promo_discount: number;
      total: number; eta_minutes: number | null; paid_at: string | null;
      delivered_at: string | null; reference: string; driver_id: string | null;
      restaurant?: { id?: string; name?: string; lat?: number | null; lng?: number | null } | null;
      delivery_address?: { line?: string; city?: string; lat?: number | null; lng?: number | null } | null;
      driver_profile?: { full_name?: string | null; phone?: string | null; photo_url?: string | null; rating?: number | null; vehicle_type?: string | null } | null;
    };
    items: OrderItem[];
    reviewExists?: boolean;
  };
  const { order: live } = useRealtimeOrder(orderId);
  const order = { ...data.order, ...(live ?? {}) };

  const stepIdx = STATUS_INDEX[order.status] ?? -1;
  const isFailedStatus = order.status === "cancelled" || order.status === "rejected";
  const currentStep = STEPS[Math.max(0, Math.min(stepIdx, STEPS.length - 1))];
  const driverLoc = useDriverLocation(order.driver_id);

  // Notifications à chaque changement de statut
  const lastStatus = useRef<string>(order.status);
  useEffect(() => {
    if (lastStatus.current === order.status) return;
    const t = STATUS_TOAST[order.status];
    if (t) {
      if (order.status === "delivered") toast.success(`${t.emoji} ${t.title}`);
      else if (order.status === "cancelled") toast.error(`${t.emoji} ${t.title}`);
      else toast.message(`${t.emoji} ${t.title}`);
    }
    lastStatus.current = order.status;
  }, [order.status]);

  const driver = useMemo<DriverInfo | null>(() => {
    if (!order.driver_id) return null;
    const profile = order.driver_profile;
    return {
      name: profile?.full_name?.trim() || "Votre livreur",
      phone: profile?.phone ?? null,
      avatar_url: profile?.photo_url ?? null,
      rating: profile?.rating ?? null,
      vehicle_type: profile?.vehicle_type ?? null,
    };
  }, [order.driver_id, order.driver_profile]);

  // Identité courante (pour le chat)
  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);
  const meRole: "client" | "driver" = meId && meId === order.driver_id ? "driver" : "client";
  const showChat = !!order.driver_id && !!meId && !order.delivered_at && order.status !== "cancelled";

  // ETA dynamique : si on a la position du livreur + destination, on recalcule
  const dynamicEtaMin = useMemo(() => {
    const dest = order.delivery_address;
    if (driverLoc && dest?.lat != null && dest?.lng != null) {
      const km = distanceKm({ lat: driverLoc.lat, lng: driverLoc.lng }, { lat: dest.lat, lng: dest.lng });
      // 22 km/h moyenne en ville (moto) → minutes, +2 min de marge
      return Math.max(1, Math.round((km / 22) * 60) + 2);
    }
    return null;
  }, [driverLoc, order.delivery_address]);

  const etaTarget = useMemo(() => {
    if (order.delivered_at) return null;
    if (dynamicEtaMin != null) return Date.now() + dynamicEtaMin * 60_000;
    if (!order.paid_at || !order.eta_minutes) return null;
    return new Date(order.paid_at).getTime() + order.eta_minutes * 60_000;
  }, [order.paid_at, order.eta_minutes, order.delivered_at, dynamicEtaMin]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remainingMs = etaTarget ? Math.max(0, etaTarget - now) : 0;
  const minutes = Math.floor(remainingMs / 60000);
  const statusSummary = isFailedStatus
    ? {
        eyebrow: "Commande arrêtée",
        main: "!",
        label: order.status === "rejected" ? "Commande refusée" : "Commande annulée",
        desc: "Cette commande ne sera pas livrée.",
        color: "#B71C1C",
      }
    : order.status === "pending_payment"
      ? {
          eyebrow: "Paiement en attente",
          main: "—",
          label: "En attente de paiement",
          desc: "Les étapes s'activeront après confirmation.",
          color: "#888888",
        }
      : {
          eyebrow: order.status === "delivered" || order.delivered_at ? "Commande livrée" : "Arrivée estimée",
          main: order.status === "delivered" || order.delivered_at ? "✓" : etaTarget ? `${minutes} min` : "—",
          label: currentStep.label,
          desc: currentStep.desc,
          color: "#06C167",
        };

  // Animation de livraison + ouverture auto du modal de notation
  const [showCelebration, setShowCelebration] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const checkReview = useServerFn(getOrderReview);
  useEffect(() => {
    if (order.status !== "delivered") return;

    if (!sessionStorage.getItem(`celebrated:${order.id}`)) {
      setShowCelebration(true);
      sessionStorage.setItem(`celebrated:${order.id}`, "1");
    }
    const t = setTimeout(() => setShowCelebration(false), 3500);

    if (!localStorage.getItem(`review_dismissed_${order.id}`)) {
      const openIfNoReview = async () => {
        const res = data.reviewExists ? { exists: true } : await checkReview({ data: { orderId: order.id } });
        if (!res.exists && !localStorage.getItem(`review_dismissed_${order.id}`)) {
          setReviewModalOpen(true);
        }
      };
      openIfNoReview().catch(() => undefined);
    }
    return () => clearTimeout(t);
  }, [checkReview, data.reviewExists, order.id, order.status]);

  // Position relative livreur sur la carte (0..1)
  const mapProgress = useMemo(() => {
    const dest = order.delivery_address;
    const resto = order.restaurant;
    if (driverLoc && dest?.lat != null && dest?.lng != null && resto?.lat != null && resto?.lng != null) {
      const total = distanceKm({ lat: resto.lat, lng: resto.lng }, { lat: dest.lat, lng: dest.lng });
      const remaining = distanceKm({ lat: driverLoc.lat, lng: driverLoc.lng }, { lat: dest.lat, lng: dest.lng });
      if (total > 0) return Math.max(0, Math.min(1, 1 - remaining / total));
    }
    return Math.min(1, (stepIdx + 1) / STEPS.length);
  }, [driverLoc, order.delivery_address, order.restaurant, stepIdx]);

  const [issueOpen, setIssueOpen] = useState(false);
  const canReportIssue = stepIdx >= 1 && !order.delivered_at && !isFailedStatus;

  // Signalements (disputes) liés à la commande — temps réel
  type Dispute = {
    id: string;
    reason: string;
    description: string | null;
    status: string;
    resolution: string | null;
    priority: string;
    created_at: string;
    resolved_at: string | null;
  };
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const refetchDisputes = useMemo(
    () => async () => {
      const { data: rows } = await supabase
        .from("disputes")
        .select("id, reason, description, status, resolution, priority, created_at, resolved_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });
      setDisputes((rows ?? []) as Dispute[]);
    },
    [order.id],
  );
  useEffect(() => {
    refetchDisputes();
    const ch = supabase
      .channel(`disputes:${order.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes", filter: `order_id=eq.${order.id}` },
        () => refetchDisputes(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [order.id, refetchDisputes]);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "#F5F0E8" }}>
      {/* Map area */}
      <div className="relative h-[42vh] min-h-[280px] overflow-hidden">
        <FauxMap progress={mapProgress} live={!!driverLoc} />

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

        {driverLoc && (
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold shadow-md" style={{ color: "#06C167" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#06C167] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#06C167]" />
            </span>
            EN DIRECT
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div className="relative -mt-6 mx-auto max-w-md px-4">
        <div className="rounded-3xl bg-white p-5 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.15)]">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888888" }}>
              {statusSummary.eyebrow}
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: "#1A1A1A" }}>
              {statusSummary.main}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: statusSummary.color }}>
              {statusSummary.label} · {statusSummary.desc}
            </p>
          </div>

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
                        style={{ backgroundColor: i <= stepIdx ? "#06C167" : "#E5E5E5" }}
                      />
                    )}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: reached ? "#06C167" : "#F4F4F4",
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
                        style={{ backgroundColor: i < stepIdx ? "#06C167" : "#E5E5E5" }}
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
        {stepIdx >= 2 && !order.delivered_at && order.driver_id && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.1)]">
            <div className="relative">
              {driver?.avatar_url ? (
                <img src={driver.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: "#06C167" }}
                >
                  {(driver?.name ?? "M").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
                <Truck className="h-2.5 w-2.5" style={{ color: "#06C167" }} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
                {driver?.name ?? "Votre livreur"}
              </p>
              <p className="flex items-center gap-1 text-xs" style={{ color: "#888888" }}>
                {driver?.rating != null ? (
                  <>
                    <Star className="h-3 w-3 fill-current" style={{ color: "#FFC107" }} />
                    <span className="font-semibold" style={{ color: "#1A1A1A" }}>{Number(driver.rating).toFixed(1)}</span>
                  </>
                ) : null}
                {driver?.vehicle_type ? <span>· {driver.vehicle_type}</span> : null}
                {driver?.phone ? <span>· {driver.phone}</span> : null}
              </p>

            </div>
            <a
              href={driver?.phone ? `sms:${driver.phone}` : undefined}
              aria-disabled={!driver?.phone}
              onClick={(e) => {
                if (!driver?.phone) {
                  e.preventDefault();
                  toast.message("Numéro indisponible pour le moment");
                }
              }}
              aria-label="Envoyer un SMS"
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F4F4F4" }}
            >
              <MessageCircle className="h-5 w-5" style={{ color: "#1A1A1A" }} />
            </a>
            <a
              href={driver?.phone ? `tel:${driver.phone}` : undefined}
              aria-disabled={!driver?.phone}
              onClick={(e) => {
                if (!driver?.phone) {
                  e.preventDefault();
                  toast.message("Numéro indisponible pour le moment");
                }
              }}
              aria-label="Appeler le livreur"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: "#06C167" }}
            >
              <Phone className="h-5 w-5" />
            </a>
          </div>
        )}

        {/* Address */}
        {order.delivery_address && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)]">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F5F0E8" }}
            >
              <MapPin className="h-4 w-4" style={{ color: "#06C167" }} />
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

        {/* Disputes status */}
        {disputes.length > 0 && (
          <div className="mt-3 space-y-2">
            {disputes.map((d) => (
              <DisputeCard key={d.id} dispute={d} />
            ))}
          </div>
        )}

        {/* Report issue button */}
        {canReportIssue && (
          <button
            type="button"
            onClick={() => setIssueOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-white py-3 text-sm font-semibold transition hover:bg-orange-50"
            style={{ borderColor: "#FFB74D", color: "#E65100" }}
          >
            <AlertTriangle className="h-4 w-4" />
            {disputes.some((d) => d.status === "open" || d.status === "in_progress")
              ? "Ajouter un autre signalement"
              : "Signaler un problème"}
          </button>
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
                  <span className="font-bold" style={{ color: "#06C167" }}>{it.qty}×</span> {it.name}
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

        {/* Bloc d'avis sur la commande livrée — un seul avis par commande désormais */}
      </div>

      {showChat && meId && (
        <div className="fixed bottom-5 right-5 z-40">
          <OrderChat
            orderId={order.id}
            meId={meId}
            meRole={meRole}
            peerName={meRole === "client" ? driver?.name ?? "Livreur" : "Client"}
          />
        </div>
      )}

      {issueOpen && (
        <IssueModal
          orderId={order.id}
          onClose={() => setIssueOpen(false)}
          onSubmitted={() => {
            setIssueOpen(false);
            refetchDisputes();
          }}
        />
      )}

      {showCelebration && <DeliveryCelebration />}

      <ReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        orderId={order.id}
        restaurantId={order.restaurant_id}
        restaurantName={order.restaurant?.name ?? "Restaurant"}
        driverId={order.driver_id}
        driverName={driver?.name ?? null}
        driverAvatar={driver?.avatar_url ?? null}
      />
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: accent ? "#06C167" : "#888888" }}>{label}</span>
      <span className="tabular-nums" style={{ color: accent ? "#06C167" : "#1A1A1A" }}>{value}</span>
    </div>
  );
}

const ISSUE_REASONS = [
  { key: "livreur_introuvable", label: "Livreur introuvable" },
  { key: "retard_important", label: "Retard important" },
  { key: "mauvaise_adresse", label: "Mauvaise adresse" },
  { key: "commande_incomplete", label: "Commande incomplète" },
  { key: "qualite", label: "Problème de qualité" },
  { key: "autre", label: "Autre" },
] as const;

function IssueModal({ orderId, onClose, onSubmitted }: { orderId: string; onClose: () => void; onSubmitted?: () => void }) {
  const reportFn = useServerFn(reportOrderIssue);
  const [reason, setReason] = useState<typeof ISSUE_REASONS[number]["key"]>("retard_important");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await reportFn({ data: { orderId, reason, description: description.trim() || undefined } });
      toast.success("Signalement envoyé — notre équipe vous recontacte");
      onSubmitted ? onSubmitted() : onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec du signalement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold" style={{ color: "#1A1A1A" }}>
            <AlertTriangle className="h-5 w-5" style={{ color: "#E65100" }} />
            Signaler un problème
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "#F4F4F4" }}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs" style={{ color: "#888888" }}>
          Choisissez la raison principale, on vous répond rapidement.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {ISSUE_REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setReason(r.key)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                reason === r.key ? "border-[#06C167] bg-[#06C167]/10 text-[#06C167]" : "border-border text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 800))}
          rows={3}
          placeholder="Détails (facultatif)…"
          className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#06C167]"
        />

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="mt-3 w-full rounded-xl bg-[#06C167] py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting ? "Envoi…" : "Envoyer le signalement"}
        </button>
      </div>
    </div>
  );
}

function DeliveryCelebration() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative flex flex-col items-center rounded-3xl bg-white px-8 py-6 shadow-2xl"
        style={{ animation: "celebrationPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        <div className="text-6xl" style={{ animation: "celebrationBounce 0.8s ease-in-out infinite alternate" }}>
          🎉
        </div>
        <p className="mt-3 text-lg font-extrabold" style={{ color: "#06C167" }}>
          Commande livrée !
        </p>
        <p className="mt-1 text-xs" style={{ color: "#888888" }}>
          Bon appétit 🍽️
        </p>
      </div>
      <style>{`
        @keyframes celebrationPop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes celebrationBounce {
          0% { transform: translateY(0) rotate(-10deg); }
          100% { transform: translateY(-10px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

function FauxMap({ progress, live }: { progress: number; live: boolean }) {
  return (
    <div className="absolute inset-0" style={{ backgroundColor: "#EBE3D5" }}>
      <svg viewBox="0 0 400 320" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CFE0CC" strokeWidth="1" />
          </pattern>
          <linearGradient id="route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06C167" />
            <stop offset="100%" stopColor="#06C167" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect width="400" height="320" fill="url(#grid)" />

        <path d="M 0 220 Q 80 200 160 210 T 320 180 T 400 160" stroke="#FFFFFF" strokeWidth="22" fill="none" strokeLinecap="round" />
        <path d="M 60 0 L 80 80 L 120 140 L 200 180 L 280 200 L 360 320" stroke="#FFFFFF" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.85" />

        <g fill="#CFE0CC">
          <rect x="20" y="60" width="40" height="50" rx="4" />
          <rect x="240" y="40" width="60" height="70" rx="4" />
          <rect x="320" y="220" width="50" height="60" rx="4" />
          <rect x="40" y="250" width="70" height="50" rx="4" />
        </g>

        <path
          d="M 50 80 C 120 100, 160 180, 240 200 S 340 240, 360 270"
          stroke="url(#route)"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="10 8"
        >
          {live && (
            <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1.5s" repeatCount="indefinite" />
          )}
        </path>

        <g transform="translate(50,80)">
          <circle r="14" fill="#FFFFFF" />
          <circle r="9" fill="#1A1A1A" />
          <text textAnchor="middle" y="4" fontSize="11" fill="#FFFFFF">🍴</text>
        </g>

        <g transform="translate(360,270)">
          <circle r="16" fill="#06C167" />
          <circle r="6" fill="#FFFFFF" />
        </g>

        <DriverMarker progress={progress} />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/15 to-transparent" />
    </div>
  );
}

function DriverMarker({ progress }: { progress: number }) {
  const t = Math.max(0, Math.min(1, progress));
  const pts = [
    { x: 50, y: 80 }, { x: 120, y: 100 }, { x: 160, y: 180 },
    { x: 240, y: 200 }, { x: 340, y: 240 }, { x: 360, y: 270 },
  ];
  const segIdx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
  const segT = t * (pts.length - 1) - segIdx;
  const a = pts[segIdx];
  const b = pts[segIdx + 1];
  const x = a.x + (b.x - a.x) * segT;
  const y = a.y + (b.y - a.y) * segT;
  return (
    <g transform={`translate(${x},${y})`} style={{ transition: "transform 1s linear" }}>
      <circle r="18" fill="#06C167" opacity="0.2">
        <animate attributeName="r" from="18" to="28" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle r="12" fill="#FFFFFF" stroke="#06C167" strokeWidth="3" />
      <text textAnchor="middle" y="4" fontSize="12">🛵</text>
    </g>
  );
}

const REASON_LABELS: Record<string, string> = {
  livreur_introuvable: "Livreur introuvable",
  retard_important: "Retard important",
  mauvaise_adresse: "Mauvaise adresse",
  commande_incomplete: "Commande incomplète",
  qualite: "Problème de qualité",
  autre: "Autre",
};

function DisputeCard({
  dispute,
}: {
  dispute: {
    id: string;
    reason: string;
    description: string | null;
    status: string;
    resolution: string | null;
    priority: string;
    created_at: string;
    resolved_at: string | null;
  };
}) {
  const statusMap: Record<string, { label: string; color: string; bg: string; Icon: typeof Clock }> = {
    open: { label: "En attente", color: "#E65100", bg: "#FFF3E0", Icon: Clock },
    in_progress: { label: "En cours de traitement", color: "#1565C0", bg: "#E3F2FD", Icon: AlertTriangle },
    resolved: { label: "Résolu", color: "#1B7F3A", bg: "#E8F7EE", Icon: ShieldCheck },
    closed: { label: "Clôturé", color: "#555555", bg: "#F0F0F0", Icon: CheckCircle2 },
    rejected: { label: "Rejeté", color: "#B71C1C", bg: "#FFEBEE", Icon: XCircle },
  };
  const s = statusMap[dispute.status] ?? statusMap.open;
  const Icon = s.Icon;
  const date = new Date(dispute.created_at).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#888888" }}>
            Signalement · {date}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold" style={{ color: "#1A1A1A" }}>
            {REASON_LABELS[dispute.reason] ?? dispute.reason}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ color: s.color, backgroundColor: s.bg }}
        >
          <Icon className="h-3 w-3" />
          {s.label}
        </span>
      </div>
      {dispute.description && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "#555555" }}>
          « {dispute.description} »
        </p>
      )}
      {dispute.resolution && (
        <div className="mt-2 rounded-xl p-2.5 text-xs" style={{ backgroundColor: "#E8F7EE", color: "#1B7F3A" }}>
          <p className="font-bold">Réponse de l'équipe</p>
          <p className="mt-0.5" style={{ color: "#1A1A1A" }}>{dispute.resolution}</p>
        </div>
      )}
    </div>
  );
}
