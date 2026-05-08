import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp, ShoppingBag, UserPlus, Bike, CheckCircle2, Clock, X, User, MapPin, Phone, CreditCard, Download,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Vue d'ensemble · Admin MboaEats" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Overview,
});

const KPIS = [
  { label: "Ventes totales", value: "4 875 000", suffix: "XAF", hint: "+12,4 % vs semaine dernière", icon: TrendingUp, accent: "primary" as const },
  { label: "Commandes aujourd'hui", value: "187", hint: "32 en cours · 155 livrées", icon: ShoppingBag, accent: "gold" as const },
  { label: "Nouveaux clients", value: "46", hint: "Douala · 7 derniers jours", icon: UserPlus, accent: "primary" as const },
  { label: "Livreurs actifs", value: "23", hint: "sur 31 partenaires", icon: Bike, accent: "gold" as const },
];

const WEEK = [
  { day: "Lun", revenu: 540_000 },
  { day: "Mar", revenu: 620_000 },
  { day: "Mer", revenu: 480_000 },
  { day: "Jeu", revenu: 720_000 },
  { day: "Ven", revenu: 910_000 },
  { day: "Sam", revenu: 1_180_000 },
  { day: "Dim", revenu: 845_000 },
];

type OrderRow = {
  id: string; client: string; amount: number;
  status: "en_cours" | "livree";
  resto: string; phone: string; address: string; payment: string; items: string[]; date: string;
};

const LAST_ORDERS: OrderRow[] = [
  { id: "MBE-2106", client: "Awa Mbarga", amount: 7_500, status: "en_cours", resto: "Le Wouri Saveurs", phone: "+237 6 99 12 34 56", address: "Akwa, rue Joss · Douala", payment: "Orange Money", items: ["Ndolé royal", "Jus de bissap"], date: "Aujourd'hui · 12:34" },
  { id: "MBE-2105", client: "Joseph Ngono", amount: 12_300, status: "livree", resto: "Soya d'Or", phone: "+237 6 77 04 88 21", address: "Bonapriso · Douala", payment: "MTN MoMo", items: ["Soya bœuf x3", "Plantain braisé"], date: "Aujourd'hui · 12:10" },
  { id: "MBE-2104", client: "Linda Etoundi", amount: 4_200, status: "livree", resto: "La Marmite Bamiléké", phone: "+237 6 90 55 41 02", address: "Bonamoussadi · Douala", payment: "Espèces", items: ["Koki maïs", "Eau minérale"], date: "Aujourd'hui · 11:48" },
  { id: "MBE-2103", client: "Patrick Mbida", amount: 9_800, status: "en_cours", resto: "Douala Fast Food", phone: "+237 6 55 23 19 77", address: "Logpom · Douala", payment: "Carte bancaire", items: ["Burger maison", "Frites", "Sprite"], date: "Aujourd'hui · 11:30" },
  { id: "MBE-2102", client: "Sylvie Kamga", amount: 15_600, status: "livree", resto: "Poisson Braisé du Port", phone: "+237 6 78 66 90 12", address: "Bali · Douala", payment: "Orange Money", items: ["Bar braisé", "Miondo", "Sauce pimentée"], date: "Aujourd'hui · 11:05" },
];

function Overview() {
  const [selected, setSelected] = useState<OrderRow | null>(null);
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">Activité MboaEats · Douala · Aperçu en direct</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-3xl border border-border bg-surface/60 p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                <k.icon className={`h-5 w-5 ${k.accent === "gold" ? "text-gold" : "text-primary"}`} />
              </span>
              {k.suffix && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.suffix}</span>}
            </div>
            <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${k.accent === "gold" ? "text-gradient-gold" : "text-gradient-primary"}`}>{k.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Revenus de la semaine</h2>
            <span className="text-xs text-muted-foreground">FCFA</span>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEK} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--gold, 45 90% 55%))" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString("fr-FR")} F`, "Revenus"]}
                />
                <Line type="monotone" dataKey="revenu" stroke="url(#lineGrad)" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <h2 className="font-display text-lg font-bold">5 dernières commandes</h2>
          <ul className="mt-4 space-y-3">
            {LAST_ORDERS.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelected(o)}
                  className="w-full rounded-2xl border border-border bg-background/40 p-3 text-left transition hover:border-primary/60 hover:bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs font-bold text-primary">{o.id}</span>
                    {o.status === "livree" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Livré
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Clock className="h-3 w-3" /> En cours
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold">{o.client}</p>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate">{o.resto}</span>
                    <span className="font-bold text-foreground">{o.amount.toLocaleString("fr-FR")} F</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {selected && <OrderDetailsPanel order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

async function exportInvoicePdf(order: OrderRow) {
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
  doc.text(order.date, w - 15, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220); doc.line(15, y, w - 15, y); y += 10;

  doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(`Commande ${order.id}`, 15, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Statut : ${order.status === "livree" ? "Livré" : "En cours"}`, w - 15, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "bold"); doc.text("Client", 15, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(order.client, 15, y); y += 5;
  doc.text(order.phone, 15, y); y += 5;
  doc.text(order.address, 15, y); y += 8;

  doc.setFont("helvetica", "bold"); doc.text("Restaurant", 15, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.text(order.resto, 15, y); y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Article", 15, y); doc.text("Qté", w - 45, y); doc.text("Montant", w - 15, y, { align: "right" });
  y += 2; doc.line(15, y, w - 15, y); y += 6;
  doc.setFont("helvetica", "normal");
  const unit = Math.round(order.amount / Math.max(1, order.items.length));
  order.items.forEach((it) => {
    doc.text(it, 15, y); doc.text("1", w - 45, y);
    doc.text(`${unit.toLocaleString("fr-FR")} XAF`, w - 15, y, { align: "right" });
    y += 6;
  });
  y += 2; doc.line(15, y, w - 15, y); y += 8;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("Total", 15, y);
  doc.text(`${order.amount.toLocaleString("fr-FR")} XAF`, w - 15, y, { align: "right" });
  y += 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Mode de paiement : ${order.payment}`, 15, y); y += 12;
  doc.text("Merci pour votre commande sur MboaEats.", 15, y);

  doc.save(`facture-${order.id}.pdf`);
}

function OrderDetailsPanel({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`Détails commande ${order.id}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="flex-1 bg-background/70 backdrop-blur-sm" />
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <p className="font-mono text-xs font-bold text-primary">{order.id}</p>
            <h3 className="mt-1 font-display text-xl font-extrabold">Détails de la commande</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{order.date}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportInvoicePdf(order)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Exporter PDF
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-background" aria-label="Fermer le panneau">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-background/40 p-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Statut</span>
            {order.status === "livree" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Livré
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                <Clock className="h-3.5 w-3.5" /> En cours
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Montant</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-gradient-gold">{order.amount.toLocaleString("fr-FR")} <span className="text-sm">XAF</span></p>
            <p className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1"><CreditCard className="h-3 w-3" /> {order.payment}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Client</p>
            <p className="text-sm font-semibold inline-flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {order.client}</p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {order.phone}</p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {order.address}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Restaurant</p>
            <p className="mt-1 text-sm font-semibold">{order.resto}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {order.items.map((it) => (
                <li key={it} className="flex items-center justify-between border-b border-border/50 py-1 last:border-0">
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
