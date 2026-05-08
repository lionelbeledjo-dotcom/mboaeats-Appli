import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, Smartphone, CheckCircle2, Clock, XCircle, Plus } from "lucide-react";

export const Route = createFileRoute("/compte/paiements")({
  component: PaiementsPage,
  head: () => ({
    meta: [
      { title: "Paiement · MboaEats" },
      { name: "description", content: "Méthodes de paiement et historique des transactions Campay (Orange Money, MTN MoMo)." },
    ],
  }),
});

type Method = {
  id: string;
  provider: "orange" | "mtn";
  label: string;
  number: string;
  primary?: boolean;
};

type Tx = {
  id: string;
  date: string;
  label: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  method: "orange" | "mtn";
};

const METHODS: Method[] = [
  { id: "m1", provider: "orange", label: "Orange Money", number: "+237 6 99 •• 12 34", primary: true },
  { id: "m2", provider: "mtn", label: "MTN MoMo", number: "+237 6 70 •• 88 21" },
];

const TRANSACTIONS: Tx[] = [
  { id: "TX-10293", date: "2026-05-07 19:42", label: "Ndolè royal · Chez Mama Africa", amount: 6500, status: "paid", method: "orange" },
  { id: "TX-10288", date: "2026-05-06 13:11", label: "Poulet DG · Le Wouri Grill", amount: 8200, status: "paid", method: "mtn" },
  { id: "TX-10271", date: "2026-05-05 21:05", label: "Eru fumé · Bafoussam Soul", amount: 4500, status: "pending", method: "orange" },
  { id: "TX-10250", date: "2026-05-03 12:38", label: "Suya combo · Yaoundé Street", amount: 3800, status: "failed", method: "mtn" },
  { id: "TX-10231", date: "2026-05-01 20:14", label: "Riz sauté crevettes · Dock 237", amount: 7400, status: "paid", method: "orange" },
];

function formatFcfa(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

const STATUS_META: Record<Tx["status"], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  paid: { label: "Payé", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  pending: { label: "En attente", icon: Clock, cls: "bg-gold/15 text-gold border-gold/30" },
  failed: { label: "Échec", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

function PaiementsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/aide" hash="categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display font-bold">Paiement</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Méthodes liées</h2>
            <button className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-primary">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Paiements sécurisés via Campay — Orange Money & MTN MoMo.</p>

          <div className="mt-4 space-y-3">
            {METHODS.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-4"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    m.provider === "orange" ? "bg-[#ff7900]/15 text-[#ff7900]" : "bg-yellow-400/15 text-yellow-400"
                  }`}
                >
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{m.label}</p>
                    {m.primary && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.number}</p>
                </div>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Historique des transactions</h2>
          <p className="text-xs text-muted-foreground">Vos paiements récents</p>

          <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
            {TRANSACTIONS.map((tx) => {
              const meta = STATUS_META[tx.status];
              const Icon = meta.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{tx.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx.date} · {tx.method === "orange" ? "Orange Money" : "MTN MoMo"} · {tx.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold">{formatFcfa(tx.amount)}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
