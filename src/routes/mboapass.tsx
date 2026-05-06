import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Crown, Check, Truck, Sparkles, Zap, Shield } from "lucide-react";

export const Route = createFileRoute("/mboapass")({
  head: () => ({
    meta: [
      { title: "MboaPass Premium — MboaEats" },
      { name: "description", content: "Livraison gratuite illimitée, réductions exclusives, support prioritaire." },
    ],
  }),
  component: MboaPassPage,
});

const plans = [
  { id: "month", label: "Mensuel", price: 2500, sub: "/ mois", best: false },
  { id: "year", label: "Annuel", price: 22000, sub: "/ an · -27%", best: true },
];

const benefits = [
  { icon: Truck, label: "Livraison gratuite illimitée à Douala & Yaoundé" },
  { icon: Sparkles, label: "-10% sur tous les restaurants partenaires" },
  { icon: Zap, label: "Préparation prioritaire (Mboa Express)" },
  { icon: Shield, label: "Support VIP 7j/7 via WhatsApp" },
  { icon: Crown, label: "Doubles points Mboa Gold à chaque commande" },
];

function MboaPassPage() {
  const [plan, setPlan] = useState("year");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <Link to="/profil" aria-label="Retour" className="rounded-full border border-border bg-surface/60 p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-lg font-bold">MboaPass Premium</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        <section className="rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/15 via-primary/10 to-transparent p-6 text-center shadow-glow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold">Livraison <span className="text-gradient-primary">illimitée</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">Économisez jusqu'à 24 000 FCFA / an sur vos frais de livraison.</p>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choisissez votre formule</p>
          <div className="grid grid-cols-2 gap-3">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                className={`relative rounded-2xl border p-4 text-left transition ${
                  plan === p.id
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border bg-surface/60"
                }`}
              >
                {p.best && (
                  <span className="absolute -top-2 right-3 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Populaire
                  </span>
                )}
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="mt-1 font-display text-xl font-bold">{p.price.toLocaleString("fr-FR")} F</p>
                <p className="text-[11px] text-muted-foreground">{p.sub}</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vos avantages</p>
          <ul className="space-y-2 rounded-2xl border border-border bg-surface/60 p-4">
            {benefits.map((b) => (
              <li key={b.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <b.icon className="h-4 w-4" />
                </span>
                <span className="text-sm">{b.label}</span>
                <Check className="ml-auto mt-1 h-4 w-4 text-emerald-400 shrink-0" />
              </li>
            ))}
          </ul>
        </section>

        <Link
          to="/checkout"
          className="block w-full rounded-full bg-gradient-primary py-4 text-center text-base font-bold text-primary-foreground shadow-glow transition hover:scale-[1.01]"
        >
          Activer MboaPass — {plans.find((p) => p.id === plan)?.price.toLocaleString("fr-FR")} FCFA
        </Link>
        <p className="text-center text-[11px] text-muted-foreground">
          Paiement sécurisé via MTN MoMo ou Orange Money. Annulable à tout moment.
        </p>
      </main>
    </div>
  );
}
