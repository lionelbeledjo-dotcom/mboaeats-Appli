import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, X, ChefHat, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listRestaurantOrders, updateOrderStatus } from "@/server/restaurant.functions";
import { usePartenaire } from "@/components/partenaire/PartenaireContext";

export const Route = createFileRoute("/partenaire/commandes")({
  component: CommandesPage,
});

type Order = {
  id: string; reference: string; status: string; total: number;
  subtotal: number;
  commission_rate_applied: number | null;
  commission_amount: number | null;
  restaurant_payout: number | null;
  created_at: string; notes: string | null;
  delivery_address: { line?: string; city?: string } | null;
  items: { id: string; name: string; qty: number; line_total: number }[];
};

const COL: { key: string; label: string; statuses: string[] }[] = [
  { key: "new", label: "Nouvelles", statuses: ["paid"] },
  { key: "prep", label: "En préparation", statuses: ["accepted", "preparing"] },
  { key: "ready", label: "Prêtes", statuses: ["ready"] },
];

function CommandesPage() {
  const { active } = usePartenaire();
  const list = useServerFn(listRestaurantOrders);
  const upd = useServerFn(updateOrderStatus);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const r = await list({ data: { restaurant_id: active.id } });
      setOrders((r.orders as unknown as Order[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [list, active.id]);

  useEffect(() => {
    setLoading(true);
    reload();
    const ch = supabase
      .channel(`partenaire-orders-${active.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${active.id}` },
        () => reload(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active.id, reload]);

  const setStatus = async (id: string, status: "accepted" | "preparing" | "ready" | "cancelled") => {
    setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await upd({ data: { order_id: id, status } });
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Mise à jour impossible");
      reload();
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="mb-5 font-display text-2xl font-bold">Commandes</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        {COL.map((c) => {
          const items = orders.filter((o) => c.statuses.includes(o.status));
          return (
            <section key={c.key} className="rounded-2xl border border-border bg-card/50 p-3">
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="font-display text-sm font-bold">{c.label}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {items.length}
                </span>
              </header>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  —
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((o) => (
                    <li key={o.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-display text-xs font-bold">{o.reference}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(o.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            {o.delivery_address?.line ?? "—"}
                          </p>
                        </div>
                        <p className="shrink-0 font-display text-sm font-bold text-primary">
                          {o.total.toLocaleString("fr-FR")} F
                        </p>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-[11px]">
                        {o.items.map((it) => (
                          <li key={it.id} className="text-muted-foreground">
                            <span className="text-foreground">{it.qty}×</span> {it.name}
                          </li>
                        ))}
                      </ul>
                      {o.notes && (
                        <p className="mt-2 rounded-md border border-border bg-surface p-1.5 text-[10px] text-muted-foreground">
                          📝 {o.notes}
                        </p>
                      )}
                      {o.commission_amount != null && o.restaurant_payout != null && (
                        <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-[10px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Sous-total plats</span>
                            <span className="tabular-nums">{o.subtotal.toLocaleString("fr-FR")} F</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Commission MboaEats{o.commission_rate_applied != null ? ` (${o.commission_rate_applied}%)` : ""}</span>
                            <span className="tabular-nums">−{o.commission_amount.toLocaleString("fr-FR")} F</span>
                          </div>
                          <div className="mt-1 border-t border-border pt-1 flex justify-between font-bold text-foreground">
                            <span>Net à percevoir</span>
                            <span className="tabular-nums text-primary">{o.restaurant_payout.toLocaleString("fr-FR")} F</span>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {o.status === "paid" && (
                          <>
                            <Btn onClick={() => setStatus(o.id, "accepted")} icon={Check} variant="primary">Accepter</Btn>
                            <Btn onClick={() => setStatus(o.id, "cancelled")} icon={X} variant="danger">Refuser</Btn>
                          </>
                        )}
                        {o.status === "accepted" && (
                          <Btn onClick={() => setStatus(o.id, "preparing")} icon={ChefHat} variant="primary">En préparation</Btn>
                        )}
                        {o.status === "preparing" && (
                          <Btn onClick={() => setStatus(o.id, "ready")} icon={ShoppingBag} variant="primary">Prête</Btn>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Btn({
  children, onClick, icon: Icon, variant,
}: {
  children: React.ReactNode; onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant: "primary" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
        variant === "primary"
          ? "bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02]"
          : "border border-destructive/40 bg-destructive/10 text-destructive"
      }`}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}
