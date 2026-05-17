import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  TrendingUp, ShoppingBag, UserPlus, Bike, CheckCircle2, Clock, X, User, MapPin, Phone, CreditCard, Download,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { getAdminOverview } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Vue d'ensemble · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Overview,
});

type RecentOrder = {
  id: string;
  reference: string;
  total: number;
  status: string;
  created_at: string;
  restaurant: string;
  client: string;
  phone: string;
};

const TERMINAL = new Set(["delivered", "cancelled", "refunded"]);

function formatXAF(n: number) {
  return n.toLocaleString("fr-FR");
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Aujourd'hui · ${time}` : `${d.toLocaleDateString("fr-FR")} · ${time}`;
}

function Overview() {
  const [selected, setSelected] = useState<RecentOrder | null>(null);
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });

  const kpis = data
    ? [
        { label: "Ventes 7j", value: formatXAF(data.gmv), suffix: "XAF", hint: `${data.ordersCount} commandes`, icon: TrendingUp, accent: "primary" as const },
        { label: "Commandes aujourd'hui", value: String(data.ordersToday), hint: `${data.ordersPending} en cours · ${data.delivered} livrées`, icon: ShoppingBag, accent: "gold" as const },
        { label: "Restaurants actifs", value: `${data.restosActive}`, hint: `sur ${data.restosTotal} partenaires`, icon: UserPlus, accent: "primary" as const },
        { label: "Livreurs en ligne", value: String(data.driversOnline), hint: `sur ${data.driversTotal} livreurs`, icon: Bike, accent: "gold" as const },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Vue d'ensemble</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Activité MboaEats · Données en direct</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les données. {(error as Error).message}
        </div>
      )}

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-border/60 bg-surface p-5">
                <div className="h-24 w-full animate-pulse rounded-2xl bg-muted/40" />
              </div>
            ))
          : kpis.map((k) => (
              <div
                key={k.label}
                className="group flex items-center gap-3 rounded-3xl border border-border/60 bg-surface p-4 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.35)] sm:block sm:p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background shadow-inner sm:h-11 sm:w-11">
                  <k.icon className={`h-6 w-6 ${k.accent === "gold" ? "text-gold" : "text-primary"}`} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1 sm:mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">{k.label}</p>
                    {k.suffix && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.suffix}</span>}
                  </div>
                  <p className={`mt-1 font-display text-3xl font-extrabold leading-tight tracking-tight tabular-nums sm:mt-1.5 sm:text-4xl ${k.accent === "gold" ? "text-gradient-gold" : "text-gradient-primary"}`}>
                    {k.value}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground sm:mt-1.5 sm:text-xs">{k.hint}</p>
                </div>
              </div>
            ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-border bg-surface/60 p-3 sm:rounded-3xl sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold sm:text-lg">Revenus de la semaine</h2>
            <span className="text-xs text-muted-foreground">FCFA</span>
          </div>
          <div className="mt-3 h-56 w-full sm:mt-4 sm:h-72">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.weekRevenue} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--gold, 45 90% 55%))" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toLocaleString("fr-FR")} F`, "Revenus"]}
                  />
                  <Line type="monotone" dataKey="revenu" stroke="url(#lineGrad)" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/60 p-3 sm:rounded-3xl sm:p-5">
          <h2 className="font-display text-lg font-bold">5 dernières commandes</h2>
          <ul className="mt-4 space-y-3">
            {(data?.recentOrders ?? []).length === 0 && !isLoading && (
              <li className="text-sm text-muted-foreground">Aucune commande récente.</li>
            )}
            {(data?.recentOrders ?? []).map((o) => {
              const isDone = o.status === "delivered";
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(o)}
                    className="w-full rounded-2xl border border-border bg-background/40 p-3 text-left transition hover:border-primary/60 hover:bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs font-bold text-primary">{o.reference}</span>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Livré
                        </span>
                      ) : TERMINAL.has(o.status) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                          {o.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <Clock className="h-3 w-3" /> {o.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold">{o.client}</p>
                    <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="truncate">{o.restaurant}</span>
                      <span className="font-bold text-foreground">{formatXAF(o.total)} F</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {selected && <OrderDetailsPanel order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

async function exportInvoicePdf(order: RecentOrder) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("MboaEats", 15, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Facture simplifiée", w - 15, y, { align: "right" });
  y += 6;
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text("Douala · Cameroun", 15, y);
  doc.text(formatDateTime(order.created_at), w - 15, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220); doc.line(15, y, w - 15, y); y += 10;

  doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(`Commande ${order.reference}`, 15, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Statut : ${order.status}`, w - 15, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "bold"); doc.text("Client", 15, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(order.client, 15, y); y += 5;
  if (order.phone) { doc.text(order.phone, 15, y); y += 5; }
  y += 3;

  doc.setFont("helvetica", "bold"); doc.text("Restaurant", 15, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.text(order.restaurant, 15, y); y += 10;

  doc.line(15, y, w - 15, y); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Total", 15, y);
  doc.text(`${formatXAF(order.total)} XAF`, w - 15, y, { align: "right" });
  y += 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
  doc.text("Merci pour votre commande sur MboaEats.", 15, y);

  doc.save(`facture-${order.reference}.pdf`);
}

function OrderDetailsPanel({ order, onClose }: { order: RecentOrder; onClose: () => void }) {
  const isDone = order.status === "delivered";
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`Détails commande ${order.reference}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="flex-1 bg-background/70 backdrop-blur-sm" />
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <p className="font-mono text-xs font-bold text-primary">{order.reference}</p>
            <h3 className="mt-1 font-display text-xl font-extrabold">Détails de la commande</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportInvoicePdf(order)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-all duration-200 hover:scale-[1.03] hover:opacity-95 active:scale-95"
            >
              <Download className="h-4 w-4" /> Exporter PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-background"
              aria-label="Fermer le panneau"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-background/40 p-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Statut</span>
            {isDone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Livré
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                <Clock className="h-3.5 w-3.5" /> {order.status}
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Montant</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-gradient-gold">{formatXAF(order.total)} <span className="text-sm">XAF</span></p>
            <p className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1"><CreditCard className="h-3 w-3" /> Paiement</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Client</p>
            <p className="text-sm font-semibold inline-flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {order.client}</p>
            {order.phone && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {order.phone}</p>
            )}
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Adresse client</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Restaurant</p>
            <p className="mt-1 text-sm font-semibold">{order.restaurant}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
