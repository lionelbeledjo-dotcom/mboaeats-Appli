import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Package, CheckCircle2, ChevronRight, MapPin, LogIn, RotateCcw, Loader2, ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyOrders, getOrder } from "@/server/marketplace.functions";
import { addToCart } from "@/hooks/use-cart";
import { RowSkeleton, EmptyState } from "@/components/ui/feedback";
import { TabErrorBoundary, TabErrorFallback } from "@/components/TabErrorBoundary";
import { useStableAuthSession } from "@/hooks/useStableAuthSession";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/commandes")({
  head: () => ({
    meta: [
      { title: "Mes Commandes — MboaEats" },
      { name: "description", content: "Historique et suivi de vos commandes." },
    ],
  }),
  component: () => (
    <TabErrorBoundary
      title="Commandes indisponibles"
      description="L'historique reste protégé : réessayez sans quitter l'application."
    >
      <CommandesPage />
    </TabErrorBoundary>
  ),
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

// Cache localStorage : restitue les commandes instantanément au tout premier
// affichage après un reload complet, AVANT que TanStack Query n'ait fetché.
const LS_KEY = "mboa_orders_cache_v1";
function readCachedOrders(): Order[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; orders: Order[] };
    if (Date.now() - parsed.ts > 24 * 60 * 60 * 1000) return null;
    return parsed.orders;
  } catch { return null; }
}
function writeCachedOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), orders })); } catch {}
}

function CommandesPage() {
  const navigate = useNavigate();
  const getOrderFn = useServerFn(getOrder);
  const fetchOrders = useServerFn(getMyOrders);
  const { isAuthenticated, isResolving, authReady } = useStableAuthSession();
  const [tab, setTab] = useState<"all" | "active" | "delivered">("all");
  const [reordering, setReordering] = useState<string | null>(null);
  const [cachedOrders, setCachedOrders] = useState<Order[] | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setCachedOrders(readCachedOrders());
  }, []);

  /**
   * Realtime : abonnement aux changements sur `orders` filtrés sur l'utilisateur
   * courant. Chaque INSERT/UPDATE/DELETE déclenche un refetch silencieux de la
   * query — mise à jour live des statuts (paid → preparing → delivered) sans
   * polling. RLS garantit qu'on ne reçoit QUE nos propres lignes.
   */
  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`orders:user:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${uid}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["my-orders"] });
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [authReady, isAuthenticated, queryClient]);

  const reorder = async (orderId: string, restoSlug: string | undefined) => {
    setReordering(orderId);
    try {
      const r = await getOrderFn({ data: { id: orderId } }) as {
        order: { restaurant_id: string };
        items: Array<{ id: string; dish_id: string | null; name: string; qty: number; unit_price: number }>;
      };
      for (const it of r.items) {
        if (!it.dish_id) continue;
        addToCart({
          id: `db__${it.dish_id}`,
          dishId: it.dish_id,
          restoId: r.order.restaurant_id,
          name: it.name,
          price: it.unit_price,
          qty: it.qty,
        });
      }
      toast.success("Articles ajoutés au panier");
      if (restoSlug) navigate({ to: "/r/$slug", params: { slug: restoSlug } });
      else navigate({ to: "/checkout" });
    } catch (e) {
      toast.error((e as Error).message ?? "Impossible de recommander");
    } finally {
      setReordering(null);
    }
  };

  // useQuery : cache mémoire partagé entre montages + refetch silencieux.
  // initialData hydrate depuis localStorage = affichage 0 ms après reload.
  // staleTime 30s = navigation aller/retour sans refetch (instantané).
  const ordersQuery = useQuery<{ orders: Order[] }>({
    queryKey: ["my-orders"],
    enabled: authReady && isAuthenticated,
    queryFn: async () => {
      console.info("[Commandes] fetch orders", { isAuthenticated });
      try {
        const r = (await fetchOrders()) as unknown as { orders?: Order[] | null };
        const orders = Array.isArray(r.orders) ? r.orders : [];
        writeCachedOrders(orders);
        setCachedOrders(orders);
        return { orders };
      } catch (error) {
        console.error("[Commandes] fetch orders failed", error);
        throw error;
      }
    },
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    // keepPreviousData : on garde l'ancienne liste affichée pendant le refetch
    // → zéro flicker, zéro skeleton lors d'un retour sur l'onglet.
    placeholderData: keepPreviousData,
  });

  const authed = isResolving ? null : isAuthenticated;
  const orders: Order[] | null = authed === false
    ? []
    : (ordersQuery.data?.orders ?? cachedOrders ?? (ordersQuery.isFetching || isResolving ? null : []));

  const filtered = (orders ?? []).filter((o) =>
    tab === "all" ? true : tab === "active" ? ACTIVE.has(o.status) : o.status === "delivered"
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/profil" aria-label="Retour" className="rounded-full border border-border bg-surface/60 p-2">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="font-display text-xl font-bold">Mes Commandes</h1>
          </div>
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
        {ordersQuery.isError ? (
          <TabErrorFallback
            title="Impossible de charger vos commandes"
            description="Votre connexion ou vos permissions ont peut-être expiré."
            onRetry={() => ordersQuery.refetch()}
          />
        ) : authed === false ? (
          <div className="rounded-2xl border border-border bg-surface/40 p-10 text-center">
            <LogIn className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Connectez-vous pour voir vos commandes.</p>
            <Link
              to="/connexion"
              preload="intent"
              aria-label="Se connecter"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#064E3B] px-6 py-3 text-base font-bold text-white border-2 border-white/95 shadow-[0_8px_24px_-8px_rgba(6,193,103,0.55)] transition-all duration-150 hover:border-[#D4AF37] active:scale-95 min-h-11 min-w-[44px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <LogIn className="h-5 w-5" strokeWidth={2.5} />
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
          <OrdersList items={filtered} reordering={reordering} onReorder={reorder} />
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      {statusLabel(status)}
    </span>
  );
}

function OrderRow({
  o,
  reordering,
  onReorder,
}: {
  o: Order;
  reordering: string | null;
  onReorder: (id: string, slug: string | undefined) => void;
}) {
  const active = ACTIVE.has(o.status);
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
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
        <span className="price text-primary">
          {o.total.toLocaleString("fr-FR")}<span className="price-currency">FCFA</span>
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
          <button
            onClick={() => onReorder(o.id, o.restaurant?.slug)}
            disabled={reordering === o.id}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface disabled:opacity-60"
          >
            {reordering === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Recommander
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Sous 15 lignes : DOM normal (overhead virtualisation > gain).
 * Au-delà : virtualisation `@tanstack/react-virtual` — scroll fluide même
 * avec 1000+ commandes, render uniquement les ~10 lignes visibles.
 */
function OrdersList({
  items,
  reordering,
  onReorder,
}: {
  items: Order[];
  reordering: string | null;
  onReorder: (id: string, slug: string | undefined) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualize = items.length > 20;

  const rowVirtualizer = useVirtualizer({
    count: virtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 124, // hauteur moyenne d'une carte (px)
    overscan: 6,
  });

  if (!virtualize) {
    return (
      <ul className="space-y-3">
        {items.map((o) => (
          <li key={o.id}>
            <OrderRow o={o} reordering={reordering} onReorder={onReorder} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto"
      style={{ height: "calc(100dvh - 180px - var(--bottom-dock-h))" }}
    >
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {rowVirtualizer.getVirtualItems().map((vi) => {
          const o = items[vi.index];
          return (
            <div
              key={o.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                paddingBottom: 12,
              }}
            >
              <OrderRow o={o} reordering={reordering} onReorder={onReorder} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
