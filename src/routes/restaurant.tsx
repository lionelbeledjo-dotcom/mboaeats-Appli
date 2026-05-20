import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SmartImage } from "@/components/SmartImage";
import {
  ArrowLeft, ChefHat, Power, Loader2, Bell, Plus, Trash2, Pencil,
  Check, X, Clock, ShoppingBag, Coins, TrendingUp, Store,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyRestaurant,
  updateMyRestaurant,
  updateMyRestaurantProfile,
  setRestaurantImage,
  listRestaurantOrders,
  updateOrderStatus,
  getRestaurantMenu,
  upsertDish,
  deleteDish,
  toggleDishAvailability,
  ensureStandardCategories,
  getRestaurantStats,
  createMyRestaurant,
} from "@/server/restaurant.functions";



export const Route = createFileRoute("/restaurant")({
  component: RestaurantSpaceGuarded,
  head: () => ({
    meta: [
      { title: "Espace Restaurant · MboaEats" },
      {
        name: "description",
        content:
          "Gérez votre menu, vos commandes entrantes en temps réel et vos statistiques.",
      },
    ],
  }),
});

type DayHours = { is_open: boolean; open: string; close: string };
type OpeningHours = Record<
  "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche",
  DayHours
>;

type Resto = {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  neighborhood: string | null;
  is_open: boolean | null;
  is_active: boolean | null;
  delivery_fee: number | null;
  eta_min: number | null;
  eta_max: number | null;
  // Pack 7
  cover_url: string | null;
  logo_url: string | null;
  phone: string | null;
  description: string | null;
  opening_hours: OpeningHours | null;
  manually_closed: boolean | null;
  // Modération : voir migration `resto_moderation`.
  validation_status: "pending" | "approved" | "rejected";
  validation_note: string | null;
  validated_at: string | null;
  created_at: string;
};

type Tab = "commandes" | "menu" | "stats" | "profil";

function RestaurantSpace() {
  const fetchResto = useServerFn(getMyRestaurant);
  const updateResto = useServerFn(updateMyRestaurant);
  const createResto = useServerFn(createMyRestaurant);

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<{ id: string; email: string | null } | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [resto, setResto] = useState<Resto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("commandes");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setSignedIn(!!u);
      setUserInfo(u ? { id: u.id, email: u.email ?? null } : null);
      if (u) {
        const { data: rr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.id);
        setRoles((rr ?? []).map((x: any) => x.role));
      }
      setAuthReady(true);
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchResto();
      // eslint-disable-next-line no-console
      console.log("[restaurant.tsx] getMyRestaurant →", r);
      setResto(r.restaurant as Resto | null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[restaurant.tsx] getMyRestaurant error", e);
      setResto(null);
    } finally {
      setLoading(false);
    }
  }, [fetchResto]);

  useEffect(() => {
    if (signedIn) reload();
  }, [signedIn, reload]);

  // eslint-disable-next-line no-console
  console.log("[restaurant.tsx] state", { user: userInfo, roles, resto });



  const updateProfile = useServerFn(updateMyRestaurantProfile);
  const autoOpen = useMemo(
    () => (resto ? isRestoOpenNow(resto.opening_hours, resto.manually_closed) : false),
    [resto],
  );

  const toggleManuallyClosed = async () => {
    if (!resto) return;
    const next = !resto.manually_closed;
    setResto({ ...resto, manually_closed: next });
    try {
      await updateProfile({ data: { manually_closed: next } });
      toast.success(next ? "Restaurant fermé temporairement" : "Fermeture manuelle levée");
    } catch (e) {
      setResto({ ...resto, manually_closed: !next });
      toast.error("Action impossible");
    }
  };

  if (!authReady || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <CenterCard>
        <h1 className="font-display text-2xl font-bold">Espace Restaurant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour gérer votre restaurant.
        </p>
        <Link
          to="/restaurant/connexion"
          preload="intent"
          aria-label="Se connecter à l'espace partenaire"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#064E3B] px-6 py-3 text-base font-bold text-white border-2 border-white/95 shadow-[0_8px_24px_-8px_rgba(6,193,103,0.55)] transition-all duration-150 hover:border-[#D4AF37] active:scale-95 min-h-11 min-w-[44px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChefHat className="h-5 w-5" strokeWidth={2.5} />
          Se connecter
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">
          Pas encore partenaire ?{" "}
          <Link
            to="/devenir-resto"
            className="font-semibold text-primary hover:underline"
          >
            Devenir restaurateur
          </Link>
        </p>
      </CenterCard>
    );
  }

  if (!resto) {
    const isRestaurateur = roles.includes("restaurateur");
    return (
      <CenterCard>
        <h1 className="font-display text-2xl font-bold">Espace restaurateur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRestaurateur
            ? "Aucun restaurant n'est encore rattaché à votre compte. Finalisez votre inscription pour démarrer."
            : "Cet espace est réservé aux restaurateurs partenaires MboaEats."}
        </p>
        <Link
          to="/devenir-resto"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow"
        >
          Devenir restaurateur
        </Link>
      </CenterCard>
    );
  }


  // ÉCRAN "EN ATTENTE DE VALIDATION" — pour un resto qui vient d'être créé
  // et n'a pas encore été validé par l'admin MboaEats.
  if (resto.validation_status === "pending") {
    return <RestaurantPendingScreen resto={resto} />;
  }

  // ÉCRAN "REFUSÉ" — pour un resto dont l'inscription a été refusée par
  // l'admin. La raison du refus (validation_note) est affichée.
  if (resto.validation_status === "rejected") {
    return <RestaurantRejectedScreen resto={resto} />;
  }

  // À ce stade : validation_status === 'approved' → dashboard normal.
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Retour à la home publique MboaEats"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Accueil MboaEats
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold leading-none">
                {resto.name}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {resto.neighborhood ?? resto.city} · {resto.cuisine}
              </p>
            </div>
          </div>
          <button
            onClick={toggleManuallyClosed}
            title={
              resto.manually_closed
                ? "Lever la fermeture temporaire"
                : "Forcer la fermeture (pause exceptionnelle)"
            }
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              autoOpen && !resto.manually_closed
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {resto.manually_closed
              ? "Fermé (manuel)"
              : autoOpen
                ? "Ouvert"
                : "Fermé (horaires)"}
          </button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 md:px-8">
          {(
            [
              ["commandes", "Commandes", Bell],
              ["menu", "Menu", ChefHat],
              ["stats", "Stats", TrendingUp],
              ["profil", "Profil", Store],
            ] as const
          ).map(([k, label, Icon]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 md:px-8">
        {tab === "commandes" && <OrdersPanel restoId={resto.id} />}
        {tab === "menu" && <MenuPanel restoId={resto.id} />}
        {tab === "stats" && <StatsPanel restoId={resto.id} />}
        {tab === "profil" && <ProfilePanel resto={resto} onSaved={reload} />}
      </main>
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface/60 p-6 text-center">
        {children}
      </div>
    </div>
  );
}

function Onboarding({
  onCreated,
}: {
  onCreated: (d: { name: string; cuisine: string; city: string; neighborhood?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("Camerounais");
  const [city, setCity] = useState("Douala");
  const [neighborhood, setNeighborhood] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <CenterCard>
      <h1 className="font-display text-2xl font-bold">Crée ton restaurant</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        En quelques secondes pour commencer à recevoir des commandes.
      </p>
      <form
        className="mt-5 space-y-3 text-left"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          try {
            await onCreated({
              name: name.trim(),
              cuisine,
              city,
              neighborhood: neighborhood.trim() || undefined,
            });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field label="Nom" value={name} onChange={setName} placeholder="Chez Mama Bello" />
        <Field label="Cuisine" value={cuisine} onChange={setCuisine} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville" value={city} onChange={setCity} />
          <Field label="Quartier" value={neighborhood} onChange={setNeighborhood} placeholder="Akwa" />
        </div>
        <button
          disabled={saving}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer mon restaurant
        </button>
      </form>
    </CenterCard>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

// ─── Commandes ──────────────────────────────────────────────────────────────
type Order = {
  id: string;
  reference: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  eta_minutes: number | null;
  created_at: string;
  paid_at: string | null;
  accepted_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_address: { line?: string; city?: string } | null;
  notes: string | null;
  client_name: string | null;
  client_phone: string | null;
  items: { id: string; name: string; qty: number; unit_price: number; line_total: number }[];
};

type OrderTab = "new" | "ongoing" | "done" | "all";

const TAB_STATUSES: Record<OrderTab, string[] | null> = {
  new: ["draft", "pending_payment", "paid"],
  ongoing: ["accepted", "preparing", "ready", "picked_up", "delivering"],
  done: ["delivered", "cancelled", "refunded"],
  all: null,
};

type PendingAction =
  | { kind: "accept"; order: Order }
  | { kind: "reject"; order: Order }
  | { kind: "preparing"; order: Order }
  | { kind: "ready"; order: Order };

const REJECT_REASONS = [
  "Restaurant fermé temporairement",
  "Plat indisponible",
  "Capacité maximale atteinte",
];

function shortRef(id: string): string {
  const clean = id.replace(/-/g, "").toUpperCase();
  const tail = clean.slice(-8);
  return `#${tail.slice(0, 4)}-${tail.slice(4)}`;
}

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function OrdersPanel({ restoId }: { restoId: string }) {
  const list = useServerFn(listRestaurantOrders);
  const update = useServerFn(updateOrderStatus);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<OrderTab>("new");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await list({ data: { restaurant_id: restoId } });
      setOrders((r.orders as unknown as Order[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [list, restoId]);

  useEffect(() => {
    setLoading(true);
    reload();
    const ch = supabase
      .channel(`resto-${restoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restoId}` },
        () => {
          reload();
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Nouvelle activité", { body: "Une commande vient d'être mise à jour" });
          }
        }
      )
      .subscribe();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    return () => {
      supabase.removeChannel(ch);
    };
  }, [restoId, reload]);

  const counts = useMemo(() => ({
    new: orders.filter((o) => TAB_STATUSES.new!.includes(o.status)).length,
    ongoing: orders.filter((o) => TAB_STATUSES.ongoing!.includes(o.status)).length,
    done: orders.filter((o) => TAB_STATUSES.done!.includes(o.status)).length,
    all: orders.length,
  }), [orders]);

  const visible = useMemo(() => {
    const s = TAB_STATUSES[tab];
    return s ? orders.filter((o) => s.includes(o.status)) : orders;
  }, [orders, tab]);

  const runUpdate = async (
    order: Order,
    status: "accepted" | "preparing" | "ready" | "cancelled",
    note?: string,
    successMsg?: string,
  ) => {
    setBusyId(order.id);
    setOrders((cur) => cur.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await update({ data: { order_id: order.id, status, note } });
      toast.success(successMsg ?? "Commande mise à jour");
      setPending(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mise à jour impossible");
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const TABS: { key: OrderTab; label: string; badge?: number }[] = [
    { key: "new", label: "Nouvelles", badge: counts.new },
    { key: "ongoing", label: "En cours", badge: counts.ongoing },
    { key: "done", label: "Terminées" },
    { key: "all", label: "Toutes" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Commandes</h2>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${
                  tab === t.key ? "bg-primary-foreground/20" : "bg-primary/15 text-primary"
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aucune commande dans cet onglet.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold">{shortRef(o.id)}</p>
                  <p className="text-[11px] text-muted-foreground">{relativeTime(o.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-display text-base font-bold text-emerald-500">
                    {o.total.toLocaleString("fr-FR")} F
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </div>

              <ul className="mt-3 space-y-1 text-xs">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>
                      <span className="text-muted-foreground">{it.qty}×</span> {it.name}
                    </span>
                    <span>{it.line_total.toLocaleString("fr-FR")} F</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-1 rounded-lg border border-border bg-background/40 p-2 text-[11px]">
                <p className="font-semibold">{o.client_name ?? "Client"}</p>
                {o.client_phone && (
                  <a href={`tel:${o.client_phone}`} className="text-primary underline">
                    {o.client_phone}
                  </a>
                )}
                <p className="text-muted-foreground">
                  📍 {o.delivery_address?.line ?? "Adresse non renseignée"}
                  {o.delivery_address?.city ? `, ${o.delivery_address.city}` : ""}
                </p>
                {o.notes && (
                  <p className="rounded-md border border-border bg-background/50 p-1.5 text-muted-foreground">
                    📝 {o.notes}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(o.status === "paid" || o.status === "pending_payment" || o.status === "draft") && (
                  <>
                    <ActionBtn
                      onClick={() => setPending({ kind: "accept", order: o })}
                      icon={Check}
                      variant="primary"
                      disabled={busyId === o.id}
                    >
                      Accepter
                    </ActionBtn>
                    <ActionBtn
                      onClick={() => setPending({ kind: "reject", order: o })}
                      icon={X}
                      variant="danger"
                      disabled={busyId === o.id}
                    >
                      Refuser
                    </ActionBtn>
                  </>
                )}
                {o.status === "accepted" && (
                  <ActionBtn
                    onClick={() => setPending({ kind: "preparing", order: o })}
                    icon={ChefHat}
                    variant="primary"
                    disabled={busyId === o.id}
                  >
                    Démarrer préparation
                  </ActionBtn>
                )}
                {o.status === "preparing" && (
                  <ActionBtn
                    onClick={() => setPending({ kind: "ready", order: o })}
                    icon={ShoppingBag}
                    variant="primary"
                    disabled={busyId === o.id}
                  >
                    Marquer prête
                  </ActionBtn>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <ConfirmModal
          action={pending}
          busy={busyId === pending.order.id}
          onClose={() => setPending(null)}
          onConfirm={(note) => {
            const o = pending.order;
            if (pending.kind === "accept") runUpdate(o, "accepted", undefined, "Commande acceptée");
            if (pending.kind === "reject") runUpdate(o, "cancelled", note, "Commande refusée");
            if (pending.kind === "preparing") runUpdate(o, "preparing", undefined, "Préparation démarrée");
            if (pending.kind === "ready") runUpdate(o, "ready", undefined, "Commande prête — le livreur va arriver");
          }}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: PendingAction;
  busy: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const ref = shortRef(action.order.id);

  const titleMap: Record<PendingAction["kind"], string> = {
    accept: `Accepter ${ref} ?`,
    reject: `Refuser ${ref}`,
    preparing: `Démarrer la préparation ?`,
    ready: `Commande prête ?`,
  };
  const descMap: Record<PendingAction["kind"], string> = {
    accept: "Le client sera prévenu que sa commande est confirmée.",
    reject: "Indique une raison — elle sera visible par le client.",
    preparing: "Le client verra que sa commande est en cours de préparation.",
    ready: "Le client sera prévenu qu'un livreur va bientôt arriver.",
  };

  const canConfirm = action.kind !== "reject" || reason.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold">{titleMap[action.kind]}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{descMap[action.kind]}</p>

        {action.kind === "reject" && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    reason === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Raison (obligatoire)"
              rows={3}
              className="w-full rounded-lg border border-border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(action.kind === "reject" ? reason.trim() : undefined)}
            disabled={!canConfirm || busy}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
              action.kind === "reject"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02]"
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {action.kind === "reject" ? "Refuser" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_payment: { label: "Paiement", cls: "bg-amber-500/15 text-amber-400" },
    paid: { label: "Nouveau", cls: "bg-primary/15 text-primary" },
    accepted: { label: "Acceptée", cls: "bg-blue-500/15 text-blue-400" },
    preparing: { label: "Préparation", cls: "bg-purple-500/15 text-purple-400" },
    ready: { label: "Prête", cls: "bg-emerald-500/15 text-emerald-400" },
    picked_up: { label: "Enlevée", cls: "bg-emerald-500/15 text-emerald-400" },
    delivering: { label: "En route", cls: "bg-emerald-500/15 text-emerald-400" },
    delivered: { label: "Livrée", cls: "bg-muted text-muted-foreground" },
    cancelled: { label: "Refusée", cls: "bg-destructive/15 text-destructive" },
    refunded: { label: "Remboursée", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  icon: Icon,
  variant,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant: "primary" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
        variant === "primary"
          ? "bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02]"
          : "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

// ─── Menu ───────────────────────────────────────────────────────────────────
type Cat = { id: string; name: string; sort_order: number | null };
type Dish = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean | null;
  is_popular: boolean | null;
};

// Liste fixe des 5 catégories standard MboaEats + emoji placeholder.
const STD_CATEGORIES = [
  "Entrée",
  "Plat",
  "Dessert",
  "Boisson",
  "Accompagnement",
] as const;

function categoryEmoji(name: string | null | undefined): string {
  switch ((name ?? "").trim()) {
    case "Entrée":
    case "Entrées":
      return "🥗";
    case "Plat":
    case "Plats":
      return "🍛";
    case "Dessert":
    case "Desserts":
      return "🍰";
    case "Boisson":
    case "Boissons":
      return "🥤";
    case "Accompagnement":
    case "Accompagnements":
      return "🍚";
    default:
      return "🍽️";
  }
}

function MenuPanel({ restoId }: { restoId: string }) {
  const fetchMenu = useServerFn(getRestaurantMenu);
  const seedCats = useServerFn(ensureStandardCategories);
  const saveDish = useServerFn(upsertDish);
  const removeDish = useServerFn(deleteDish);
  const toggleDish = useServerFn(toggleDishAvailability);

  const [cats, setCats] = useState<Cat[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Dish> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dish | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Garantit que les 5 catégories standard existent avant d'afficher.
      try {
        await seedCats({ data: { restaurant_id: restoId } });
      } catch (e) {
        console.warn("[MenuPanel] ensureStandardCategories failed:", e);
      }
      const r = await fetchMenu({ data: { restaurant_id: restoId } });
      setCats((r.categories ?? []) as Cat[]);
      setDishes((r.dishes ?? []) as Dish[]);
    } catch (e: any) {
      console.error("[MenuPanel] fetchMenu failed:", e);
      setLoadError(e?.message ?? "Impossible de charger le menu.");
      setCats([]);
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, [fetchMenu, seedCats, restoId]);

  useEffect(() => { reload(); }, [reload]);

  // Trie les catégories selon l'ordre standard, puis le reste alphabétique.
  const orderedCats = useMemo(() => {
    const idx = (n: string) => {
      const i = STD_CATEGORIES.findIndex(
        (s) => s === n || s + "s" === n,
      );
      return i === -1 ? 99 : i;
    };
    return [...cats].sort((a, b) => {
      const da = idx(a.name) - idx(b.name);
      return da !== 0 ? da : a.name.localeCompare(b.name);
    });
  }, [cats]);

  const grouped = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const d of dishes) {
      const k = d.category_id ?? "_";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return m;
  }, [dishes]);

  const handleToggle = async (d: Dish) => {
    // Optimistic update
    setDishes((prev) =>
      prev.map((x) =>
        x.id === d.id ? { ...x, is_available: !x.is_available } : x,
      ),
    );
    try {
      const r = await toggleDish({
        data: { id: d.id, restaurant_id: restoId },
      });
      toast.success(r.is_available ? "Plat disponible" : "Plat indisponible");
    } catch (e: any) {
      // Rollback
      setDishes((prev) =>
        prev.map((x) =>
          x.id === d.id ? { ...x, is_available: d.is_available } : x,
        ),
      );
      toast.error(e?.message ?? "Échec du changement");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeDish({
        data: { id: deleteTarget.id, restaurant_id: restoId },
      });
      toast.success("Plat supprimé");
      setDeleteTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la suppression");
    }
  };

  if (loading) {
    return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  }

  const hasDishes = dishes.length > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Menu</h2>
        <button
          onClick={() =>
            setEditing({ name: "", price: 0, is_available: true })
          }
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter un plat
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {!hasDishes && !loadError && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <ChefHat className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-display text-base font-bold">
            Aucun plat dans votre menu
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez votre premier plat pour démarrer.
          </p>
          <button
            onClick={() =>
              setEditing({ name: "", price: 0, is_available: true })
            }
            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un plat
          </button>
        </div>
      )}

      {hasDishes && (
        <div className="space-y-6">
          {orderedCats.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={cat.id}>
                <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold">
                  <span aria-hidden>{categoryEmoji(cat.name)}</span>
                  {cat.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </h3>
                <ul className="grid gap-2 md:grid-cols-2">
                  {items.map((d) => (
                    <DishRow
                      key={d.id}
                      dish={d}
                      categoryName={cat.name}
                      onEdit={() => setEditing(d)}
                      onDelete={() => setDeleteTarget(d)}
                      onToggle={() => handleToggle(d)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          {(grouped.get("_") ?? []).length > 0 && (
            <section>
              <h3 className="mb-2 font-display text-base font-bold text-muted-foreground">
                Sans catégorie
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {(grouped.get("_") ?? []).map((d) => (
                  <DishRow
                    key={d.id}
                    dish={d}
                    categoryName={null}
                    onEdit={() => setEditing(d)}
                    onDelete={() => setDeleteTarget(d)}
                    onToggle={() => handleToggle(d)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {editing && (
        <DishModal
          initial={editing}
          categories={orderedCats}
          restoId={restoId}
          onClose={() => setEditing(null)}
          onSave={async (d) => {
            await saveDish({
              data: {
                id: d.id,
                restaurant_id: restoId,
                category_id: d.category_id ?? null,
                name: d.name!,
                description: d.description ?? null,
                price: d.price ?? 0,
                image_url: d.image_url || undefined,
                is_available: d.is_available ?? true,
                is_popular: d.is_popular ?? false,
              },
            });
            toast.success(d.id ? "Plat mis à jour" : "Plat ajouté");
            setEditing(null);
            reload();
          }}
        />
      )}

      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title="Supprimer le plat">
          <p className="text-sm text-muted-foreground">
            Supprimer <span className="font-semibold text-foreground">{deleteTarget.name}</span> ?
            Cette action est irréversible.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              className="inline-flex items-center gap-1 rounded-xl bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DishRow({
  dish, categoryName, onEdit, onDelete, onToggle,
}: {
  dish: Dish;
  categoryName: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const available = dish.is_available ?? true;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-2xl">
        {dish.image_url ? (
          <SmartImage
            src={dish.image_url}
            alt={dish.name}
            ratio="1 / 1"
            width={56}
            height={56}
            wrapperClassName="!h-full"
          />
        ) : (
          <span aria-hidden>{categoryEmoji(categoryName)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{dish.name}</p>
        {dish.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {dish.description}
          </p>
        )}
        <p className="text-xs font-bold text-primary">
          {dish.price.toLocaleString("fr-FR")} FCFA
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={available}
          title={available ? "Disponible" : "Indisponible"}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            available ? "bg-emerald-500" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              available ? "left-4" : "left-0.5"
            }`}
          />
        </button>
        <div className="flex gap-0.5">
          <button
            onClick={onEdit}
            title="Éditer"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            title="Supprimer"
            className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function DishModal({
  initial, categories, restoId, onClose, onSave,
}: {
  initial: Partial<Dish>;
  categories: Cat[];
  restoId: string;
  onClose: () => void;
  onSave: (d: Partial<Dish>) => Promise<void>;
}) {
  const [d, setD] = useState<Partial<Dish>>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const nameOk = (d.name ?? "").trim().length >= 2;
  const priceOk =
    typeof d.price === "number" && Number.isInteger(d.price) && d.price >= 0;
  const categoryOk = !!d.category_id;
  const canSave = nameOk && priceOk && categoryOk && !saving && !uploading;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Format d'image invalide");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${restoId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("dish-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage
        .from("dish-images")
        .getPublicUrl(path);
      setD((prev) => ({ ...prev, image_url: pub.publicUrl }));
    } catch (e: any) {
      toast.error(e?.message ?? "Upload échoué");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal onClose={onClose} title={initial.id ? "Modifier le plat" : "Nouveau plat"}>
      <div className="space-y-3">
        <Field
          label="Nom *"
          value={d.name ?? ""}
          onChange={(v) => setD({ ...d, name: v })}
          placeholder="Ndolè aux crevettes"
        />
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">
            Description
          </span>
          <textarea
            value={d.description ?? ""}
            onChange={(e) =>
              setD({ ...d, description: e.target.value.slice(0, 280) })
            }
            rows={2}
            maxLength={280}
            placeholder="Quelques mots pour donner envie…"
            className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <span className="mt-0.5 block text-right text-[10px] text-muted-foreground">
            {(d.description ?? "").length}/280
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Prix (FCFA) *"
            type="number"
            value={String(d.price ?? 0)}
            onChange={(v) =>
              setD({ ...d, price: Math.max(0, parseInt(v || "0", 10)) })
            }
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">
              Catégorie *
            </span>
            <select
              value={d.category_id ?? ""}
              onChange={(e) =>
                setD({ ...d, category_id: e.target.value || null })
              }
              className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">— Choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryEmoji(c.name)} {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="text-xs font-semibold text-muted-foreground">
            Image (optionnel)
          </span>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface text-3xl">
              {d.image_url ? (
                <img
                  src={d.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden>🍽️</span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold hover:border-primary/40">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {d.image_url ? "Changer l'image" : "Choisir une image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {d.image_url && (
                <button
                  type="button"
                  onClick={() => setD({ ...d, image_url: null })}
                  className="self-start text-xs text-destructive hover:underline"
                >
                  Retirer l'image
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={d.is_available ?? true}
            onChange={(e) =>
              setD({ ...d, is_available: e.target.checked })
            }
          />
          Disponible immédiatement
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-xs font-bold"
        >
          Annuler
        </button>
        <button
          disabled={!canSave}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(d);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erreur");
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Enregistrer
        </button>
      </div>
    </Modal>
  );
}




function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur md:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-glow animate-fade-up"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function StatsPanel({ restoId }: { restoId: string }) {
  const fetchStats = useServerFn(getRestaurantStats);
  const [s, setS] = useState<{
    ordersCount: number;
    deliveredCount: number;
    inProgress: number;
    revenue: number;
    avgTicket: number;
  } | null>(null);

  useEffect(() => {
    fetchStats({ data: { restaurant_id: restoId } }).then(setS);
  }, [fetchStats, restoId]);

  if (!s) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  const cards = [
    { icon: ShoppingBag, label: "Commandes (7j)", value: s.ordersCount },
    { icon: Check, label: "Livrées", value: s.deliveredCount },
    { icon: Clock, label: "En cours", value: s.inProgress },
    { icon: Coins, label: "CA (7j)", value: `${s.revenue.toLocaleString("fr-FR")} F` },
    { icon: TrendingUp, label: "Ticket moyen", value: `${s.avgTicket.toLocaleString("fr-FR")} F` },
  ];

  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Statistiques</h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profil (Pack 7) ────────────────────────────────────────────────────────

const DEFAULT_HOURS: OpeningHours = {
  lundi:    { is_open: true, open: "09:00", close: "22:00" },
  mardi:    { is_open: true, open: "09:00", close: "22:00" },
  mercredi: { is_open: true, open: "09:00", close: "22:00" },
  jeudi:    { is_open: true, open: "09:00", close: "22:00" },
  vendredi: { is_open: true, open: "09:00", close: "22:00" },
  samedi:   { is_open: true, open: "09:00", close: "22:00" },
  dimanche: { is_open: true, open: "09:00", close: "22:00" },
};

const DAY_LABELS: Array<[keyof OpeningHours, string]> = [
  ["lundi", "Lundi"], ["mardi", "Mardi"], ["mercredi", "Mercredi"],
  ["jeudi", "Jeudi"], ["vendredi", "Vendredi"], ["samedi", "Samedi"],
  ["dimanche", "Dimanche"],
];

export function isRestoOpenNow(
  hours: OpeningHours | null | undefined,
  manuallyClosed: boolean | null | undefined,
): boolean {
  if (manuallyClosed) return false;
  const h = hours ?? DEFAULT_HOURS;
  const now = new Date();
  const jsDay = now.getDay(); // 0 = dimanche
  const order: Array<keyof OpeningHours> = [
    "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
  ];
  const day = h[order[jsDay]];
  if (!day?.is_open) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = day.open.split(":").map(Number);
  const [ch, cm] = day.close.split(":").map(Number);
  return cur >= oh * 60 + om && cur <= ch * 60 + cm;
}

function ProfilePanel({ resto, onSaved }: { resto: Resto; onSaved: () => void }) {
  const updateProfile = useServerFn(updateMyRestaurantProfile);
  const setImage = useServerFn(setRestaurantImage);

  const [description, setDescription] = useState(resto.description ?? "");
  const [phone, setPhone] = useState(resto.phone ?? "");
  const [hours, setHours] = useState<OpeningHours>(
    (resto.opening_hours && Object.keys(resto.opening_hours).length >= 7
      ? resto.opening_hours
      : DEFAULT_HOURS) as OpeningHours,
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(resto.cover_url);
  const [logoUrl, setLogoUrl] = useState<string | null>(resto.logo_url);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "logo" | null>(null);

  const initials = useMemo(
    () =>
      resto.name
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [resto.name],
  );

  const handleUpload = async (kind: "cover" | "logo", file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Sélectionnez une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (5 Mo max)");
      return;
    }
    setUploading(kind);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `restaurants/${resto.id}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("restaurant-images")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("restaurant-images").getPublicUrl(path);
      const url = pub.publicUrl;
      await setImage({ data: { kind, url } });
      if (kind === "cover") setCoverUrl(url);
      else setLogoUrl(url);
      toast.success("Image mise à jour");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload impossible");
    } finally {
      setUploading(null);
    }
  };

  const saveInfo = async () => {
    if (description.length > 280) {
      toast.error("Description trop longue (280 max)");
      return;
    }
    setSavingInfo(true);
    try {
      await updateProfile({
        data: {
          description: description.trim() || null,
          phone: phone.trim() || null,
        },
      });
      toast.success("Informations enregistrées");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingInfo(false);
    }
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      await updateProfile({ data: { opening_hours: hours } });
      toast.success("Horaires enregistrés");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingHours(false);
    }
  };

  const copyMondayToAll = () => {
    const monday = hours.lundi;
    const next = { ...hours } as OpeningHours;
    for (const [k] of DAY_LABELS) next[k] = { ...monday };
    setHours(next);
    toast.success("Lundi copié sur tous les jours");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="font-display text-xl font-bold">Profil restaurant</h2>

      {/* Section 1 — Identité visuelle */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative h-40 w-full bg-gradient-to-br from-emerald-600 to-emerald-400">
          {coverUrl && (
            <SmartImage
              src={coverUrl}
              alt="Couverture"
              className="h-full w-full object-cover"
            />
          )}
          <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-black/70">
            {uploading === "cover" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            Changer la photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload("cover", e.target.files[0])}
            />
          </label>

          <label className="absolute -bottom-8 left-5 block cursor-pointer">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-card bg-emerald-500 shadow-glow">
              {logoUrl ? (
                <SmartImage src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-white">
                  {initials || <ChefHat className="h-8 w-8" />}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                <Pencil className="h-4 w-4 text-white" />
              </div>
            </div>
            <span className="absolute -right-1 bottom-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
              {uploading === "logo" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Pencil className="h-3 w-3" />
              )}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload("logo", e.target.files[0])}
            />
          </label>
        </div>
        <div className="px-5 pb-5 pt-12">
          <p className="font-display text-lg font-bold">{resto.name}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Le nom ne peut être modifié — contactez le support si nécessaire.
          </p>
        </div>
      </section>

      {/* Section 2 — Informations */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-base font-bold">Informations</h3>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">
            Description ({description.length}/280)
          </span>
          <textarea
            value={description}
            maxLength={280}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Présentez votre restaurant en quelques mots."
            className="mt-1 w-full resize-none rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">
            Téléphone de contact
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+237 6XX XX XX XX"
            className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          onClick={saveInfo}
          disabled={savingInfo}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {savingInfo && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </button>
      </section>

      {/* Section 3 — Horaires */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold">Horaires d'ouverture</h3>
          <button
            type="button"
            onClick={copyMondayToAll}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Copier lundi sur tous les jours
          </button>
        </div>

        <div className="space-y-2">
          {DAY_LABELS.map(([key, label]) => {
            const d = hours[key];
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2"
              >
                <span className="w-20 text-sm font-semibold">{label}</span>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={d.is_open}
                    onChange={(e) =>
                      setHours({ ...hours, [key]: { ...d, is_open: e.target.checked } })
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Ouvert</span>
                </label>
                {d.is_open ? (
                  <div className="ml-auto flex items-center gap-2">
                    <input
                      type="time"
                      value={d.open}
                      onChange={(e) =>
                        setHours({ ...hours, [key]: { ...d, open: e.target.value } })
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                    <span className="text-muted-foreground">→</span>
                    <input
                      type="time"
                      value={d.close}
                      onChange={(e) =>
                        setHours({ ...hours, [key]: { ...d, close: e.target.value } })
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                  </div>
                ) : (
                  <span className="ml-auto rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Fermé
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={saveHours}
          disabled={savingHours}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {savingHours && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer les horaires
        </button>
      </section>
    </div>
  );
}

// ============================================================================
// ÉCRANS DE MODÉRATION — affichés selon validation_status
// ============================================================================

/**
 * Écran "En attente de validation" — affiché tant que l'admin n'a pas validé
 * le restaurant. Le restaurateur ne peut pas accéder au dashboard ni recevoir
 * des commandes — son resto est invisible côté client.
 *
 * Affiche :
 *   - Confirmation visuelle que la demande a bien été reçue
 *   - Récap des infos du resto (nom, ville, cuisine) — rassure
 *   - Date de la demande
 *   - Délai estimé (24-48h)
 *   - Possibilité de se déconnecter ou contacter le support
 */
function RestaurantPendingScreen({ resto }: { resto: Resto }) {
  const createdDate = new Date(resto.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 shadow-glow text-center">
        {/* Icône d'attente */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15">
          <Clock className="h-10 w-10 text-amber-500" strokeWidth={2.25} />
        </div>

        {/* Titre + intro */}
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Demande en cours de validation
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Votre inscription est bien arrivée. Notre équipe vérifie votre dossier
          avant de vous donner accès à votre tableau de bord.
        </p>

        {/* Récap des infos du resto */}
        <div className="mt-6 rounded-2xl border border-border bg-background p-5 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Restaurant soumis
          </p>
          <p className="mt-1.5 font-display text-lg font-bold text-foreground">
            {resto.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Store className="h-3.5 w-3.5" /> {resto.cuisine}
            </span>
            <span>·</span>
            <span>{resto.neighborhood ?? resto.city}</span>
            <span>·</span>
            <span>Demande du {createdDate}</span>
          </div>
        </div>

        {/* Délai */}
        <div className="mt-5 rounded-xl bg-primary/5 px-4 py-3 text-left">
          <p className="text-xs text-foreground">
            <span className="font-bold">Délai habituel : 24 à 48 heures ouvrées.</span>
            <br />
            <span className="text-muted-foreground">
              Vous recevrez un email à la décision. En cas de validation, votre
              tableau de bord sera immédiatement actif.
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted/40"
          >
            Retour à l'accueil
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-muted px-5 text-sm font-semibold text-foreground hover:bg-muted/70"
          >
            Se déconnecter
          </button>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          Une question ?{" "}
          <a
            href="mailto:partenaires@mboaeat.site"
            className="font-semibold text-primary hover:underline"
          >
            partenaires@mboaeat.site
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Écran "Demande refusée" — affiché si l'admin a refusé le dossier.
 * La raison du refus (validation_note) est affichée pour permettre au
 * restaurateur de corriger ou comprendre.
 */
function RestaurantRejectedScreen({ resto }: { resto: Resto }) {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 shadow-glow text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15">
          <X className="h-10 w-10 text-destructive" strokeWidth={2.25} />
        </div>

        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Demande non retenue
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Après examen, notre équipe n'a pas pu valider votre inscription en
          l'état.
        </p>

        {/* Raison du refus */}
        {resto.validation_note && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">
              Motif communiqué par notre équipe
            </p>
            <p className="mt-2 text-sm text-foreground">
              {resto.validation_note}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-muted/40 px-4 py-3 text-left">
          <p className="text-xs text-muted-foreground">
            Vous pouvez nous contacter pour comprendre le motif ou soumettre une
            nouvelle demande avec les éléments demandés.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href="mailto:partenaires@mboaeat.site"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-primary px-5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Contacter le support
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted/40"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

import { RoleGuard } from "@/components/RoleGuard";
void RoleGuard;
function RestaurantSpaceGuarded() {
  // La priorité de rendu est gérée directement par RestaurantSpace :
  // 1) non connecté → CTA connexion ; 2) resto en base → pending/rejected/dashboard ;
  // 3) connecté sans resto → écran "Espace réservé" (CTA devenir-resto).
  // On NE PASSE PLUS par RoleGuard, qui se basait sur restaurant_members
  // et bloquait les restaurateurs dont la membership n'avait pas (encore) été créée.
  return <RestaurantSpace />;
}

