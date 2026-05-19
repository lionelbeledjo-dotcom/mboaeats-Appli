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
  listRestaurantOrders,
  updateOrderStatus,
  getRestaurantMenu,
  upsertCategory,
  deleteCategory,
  upsertDish,
  deleteDish,
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



  const toggleOpen = async () => {
    if (!resto) return;
    const next = !resto.is_open;
    setResto({ ...resto, is_open: next });
    try {
      await updateResto({ data: { id: resto.id, is_open: next } });
      toast.success(next ? "Restaurant ouvert" : "Restaurant fermé");
    } catch (e) {
      setResto({ ...resto, is_open: !next });
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
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Site
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
            onClick={toggleOpen}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              resto.is_open
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {resto.is_open ? "Ouvert" : "Fermé"}
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
  items: { id: string; name: string; qty: number; unit_price: number; line_total: number }[];
};

function OrdersPanel({ restoId }: { restoId: string }) {
  const list = useServerFn(listRestaurantOrders);
  const update = useServerFn(updateOrderStatus);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await list({ data: { restaurant_id: restoId } });
      setOrders((r.orders as unknown as Order[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [list, restoId]);

  useEffect(() => {
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

  const visible = filter === "active"
    ? orders.filter((o) => !["delivered", "cancelled"].includes(o.status))
    : orders;

  const setStatus = async (id: string, status: "accepted" | "preparing" | "ready" | "cancelled") => {
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await update({ data: { order_id: id, status } });
      toast.success(`Commande ${status}`);
    } catch (e) {
      toast.error("Mise à jour impossible");
      reload();
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Commandes</h2>
        <div className="flex gap-1 rounded-xl border border-border bg-surface/60 p-1">
          {(["active", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {f === "active" ? "Actives" : "Toutes"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aucune commande pour le moment.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-bold">{o.reference}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {o.delivery_address?.line ?? "Adresse non renseignée"}
                  </p>
                </div>
                <StatusBadge status={o.status} />
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
              {o.notes && (
                <p className="mt-2 rounded-lg border border-border bg-background/50 p-2 text-[11px] text-muted-foreground">
                  📝 {o.notes}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="font-display text-base font-bold text-primary">
                  {o.total.toLocaleString("fr-FR")} F
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {o.status === "paid" && (
                  <>
                    <ActionBtn onClick={() => setStatus(o.id, "accepted")} icon={Check} variant="primary">
                      Accepter
                    </ActionBtn>
                    <ActionBtn onClick={() => setStatus(o.id, "cancelled")} icon={X} variant="danger">
                      Refuser
                    </ActionBtn>
                  </>
                )}
                {o.status === "accepted" && (
                  <ActionBtn onClick={() => setStatus(o.id, "preparing")} icon={ChefHat} variant="primary">
                    En préparation
                  </ActionBtn>
                )}
                {o.status === "preparing" && (
                  <ActionBtn onClick={() => setStatus(o.id, "ready")} icon={ShoppingBag} variant="primary">
                    Prêt à enlever
                  </ActionBtn>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
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
    cancelled: { label: "Annulée", cls: "bg-destructive/15 text-destructive" },
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant: "primary" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
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

function MenuPanel({ restoId }: { restoId: string }) {
  const fetchMenu = useServerFn(getRestaurantMenu);
  const saveCat = useServerFn(upsertCategory);
  const removeCat = useServerFn(deleteCategory);
  const saveDish = useServerFn(upsertDish);
  const removeDish = useServerFn(deleteDish);

  const [cats, setCats] = useState<Cat[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Dish> | null>(null);
  const [editingCat, setEditingCat] = useState<Partial<Cat> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetchMenu({ data: { restaurant_id: restoId } });
      setCats((r.categories ?? []) as Cat[]);
      setDishes((r.dishes ?? []) as Dish[]);
    } catch (e: any) {
      // BUG 4 : sans cette garde, le throw d'une server function (ex. 403
      // assertMembership, table absente, RLS) crashe tout l'onglet Menu et
      // affiche l'écran d'erreur générique du route boundary. On préfère
      // logguer + afficher un empty state propre pour ne pas bloquer le
      // restaurateur.
      console.error("[MenuPanel] fetchMenu failed:", e);
      setLoadError(e?.message ?? "Impossible de charger le menu pour le moment.");
      setCats([]);
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, [fetchMenu, restoId]);

  useEffect(() => { reload(); }, [reload]);

  const grouped = useMemo(() => {
    const m = new Map<string, Dish[]>();
    for (const d of dishes) {
      const k = d.category_id ?? "_";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
    return m;
  }, [dishes]);

  if (loading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Menu</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setEditingCat({ name: "" })}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold hover:border-primary/40"
          >
            <Plus className="h-3.5 w-3.5" /> Catégorie
          </button>
          <button
            onClick={() => setEditing({ name: "", price: 0, is_available: true })}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau plat
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError} — réessayez plus tard ou contactez le support si le
          problème persiste.
        </div>
      )}

      {cats.length === 0 && dishes.length === 0 && !loadError && (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aucun plat dans votre menu. Créez une catégorie puis ajoutez votre
          premier plat pour démarrer.
        </p>
      )}

      <div className="space-y-6">
        {cats.map((cat) => (
          <section key={cat.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">{cat.name}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingCat(cat)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Supprimer cette catégorie ?")) return;
                    await removeCat({ data: { id: cat.id } });
                    toast.success("Catégorie supprimée");
                    reload();
                  }}
                  className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {(grouped.get(cat.id) ?? []).map((d) => (
                <DishRow key={d.id} dish={d} onEdit={() => setEditing(d)} onDelete={async () => {
                  if (!confirm(`Supprimer ${d.name} ?`)) return;
                  await removeDish({ data: { id: d.id } });
                  toast.success("Plat supprimé");
                  reload();
                }} />
              ))}
            </ul>
          </section>
        ))}
        {(grouped.get("_") ?? []).length > 0 && (
          <section>
            <h3 className="mb-2 font-display text-base font-bold text-muted-foreground">
              Sans catégorie
            </h3>
            <ul className="grid gap-2 md:grid-cols-2">
              {(grouped.get("_") ?? []).map((d) => (
                <DishRow key={d.id} dish={d} onEdit={() => setEditing(d)} onDelete={async () => {
                  await removeDish({ data: { id: d.id } });
                  reload();
                }} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {editing && (
        <DishModal
          initial={editing}
          categories={cats}
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
            toast.success(d.id ? "Plat mis à jour" : "Plat créé");
            setEditing(null);
            reload();
          }}
        />
      )}

      {editingCat && (
        <CategoryModal
          initial={editingCat}
          onClose={() => setEditingCat(null)}
          onSave={async (c) => {
            await saveCat({
              data: {
                id: c.id,
                restaurant_id: restoId,
                name: c.name!,
                sort_order: c.sort_order ?? 0,
              },
            });
            toast.success(c.id ? "Catégorie mise à jour" : "Catégorie créée");
            setEditingCat(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function DishRow({
  dish, onEdit, onDelete,
}: {
  dish: Dish; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface">
        {dish.image_url && (
          <SmartImage src={dish.image_url} alt={dish.name} ratio="1 / 1" width={56} height={56} wrapperClassName="!h-full" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{dish.name}</p>
          {!dish.is_available && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Indispo
            </span>
          )}
        </div>
        <p className="text-xs text-primary">{dish.price.toLocaleString("fr-FR")} F</p>
      </div>
      <button onClick={onEdit} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function DishModal({
  initial, categories, onClose, onSave,
}: {
  initial: Partial<Dish>;
  categories: Cat[];
  onClose: () => void;
  onSave: (d: Partial<Dish>) => Promise<void>;
}) {
  const [d, setD] = useState<Partial<Dish>>(initial);
  const [saving, setSaving] = useState(false);

  return (
    <Modal onClose={onClose} title={initial.id ? "Modifier le plat" : "Nouveau plat"}>
      <div className="space-y-3">
        <Field label="Nom" value={d.name ?? ""} onChange={(v) => setD({ ...d, name: v })} />
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Description</span>
          <textarea
            value={d.description ?? ""}
            onChange={(e) => setD({ ...d, description: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Prix (FCFA)"
            type="number"
            value={String(d.price ?? 0)}
            onChange={(v) => setD({ ...d, price: parseInt(v || "0", 10) })}
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Catégorie</span>
            <select
              value={d.category_id ?? ""}
              onChange={(e) => setD({ ...d, category_id: e.target.value || null })}
              className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">— Aucune —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
        <Field
          label="URL de l'image"
          value={d.image_url ?? ""}
          onChange={(v) => setD({ ...d, image_url: v })}
          placeholder="https://…"
        />
        <div className="flex gap-4 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={d.is_available ?? true}
              onChange={(e) => setD({ ...d, is_available: e.target.checked })}
            />
            Disponible
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={d.is_popular ?? false}
              onChange={(e) => setD({ ...d, is_popular: e.target.checked })}
            />
            Plat populaire
          </label>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-xs font-bold">
          Annuler
        </button>
        <button
          disabled={saving || !d.name?.trim()}
          onClick={async () => {
            setSaving(true);
            try { await onSave(d); } catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
            finally { setSaving(false); }
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

function CategoryModal({
  initial, onClose, onSave,
}: {
  initial: Partial<Cat>;
  onClose: () => void;
  onSave: (c: Partial<Cat>) => Promise<void>;
}) {
  const [c, setC] = useState<Partial<Cat>>(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Modal onClose={onClose} title={initial.id ? "Modifier la catégorie" : "Nouvelle catégorie"}>
      <Field label="Nom" value={c.name ?? ""} onChange={(v) => setC({ ...c, name: v })} placeholder="Entrées" />
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-xs font-bold">Annuler</button>
        <button
          disabled={saving || !c.name?.trim()}
          onClick={async () => { setSaving(true); try { await onSave(c); } finally { setSaving(false); } }}
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

// ─── Profil ─────────────────────────────────────────────────────────────────
function ProfilePanel({ resto, onSaved }: { resto: Resto; onSaved: () => void }) {
  const update = useServerFn(updateMyRestaurant);
  const [form, setForm] = useState({
    name: resto.name,
    cuisine: resto.cuisine,
    neighborhood: resto.neighborhood ?? "",
    eta_min: resto.eta_min ?? 20,
    eta_max: resto.eta_max ?? 40,
    delivery_fee: resto.delivery_fee ?? 0,
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="max-w-xl">
      <h2 className="mb-4 font-display text-xl font-bold">Profil restaurant</h2>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <Field label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Cuisine" value={form.cuisine} onChange={(v) => setForm({ ...form, cuisine: v })} />
        <Field label="Quartier" value={form.neighborhood} onChange={(v) => setForm({ ...form, neighborhood: v })} />
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="ETA min"
            type="number"
            value={String(form.eta_min)}
            onChange={(v) => setForm({ ...form, eta_min: parseInt(v || "0", 10) })}
          />
          <Field
            label="ETA max"
            type="number"
            value={String(form.eta_max)}
            onChange={(v) => setForm({ ...form, eta_max: parseInt(v || "0", 10) })}
          />
          <Field
            label="Livraison F"
            type="number"
            value={String(form.delivery_fee)}
            onChange={(v) => setForm({ ...form, delivery_fee: parseInt(v || "0", 10) })}
          />
        </div>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await update({
                data: {
                  id: resto.id,
                  name: form.name,
                  cuisine: form.cuisine,
                  neighborhood: form.neighborhood || null,
                  eta_min: form.eta_min,
                  eta_max: form.eta_max,
                  delivery_fee: form.delivery_fee,
                },
              });
              toast.success("Profil enregistré");
              onSaved();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erreur");
            } finally {
              setSaving(false);
            }
          }}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </button>
      </div>
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

