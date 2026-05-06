import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users, Copy, Check, Share2, Plus, Trash2, Crown, MessageCircle,
  Smartphone, Clock, ArrowLeft, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/tablee")({
  head: () => ({
    meta: [
      { title: "Mode Tablée — MboaEats" },
      { name: "description", content: "Commandez à plusieurs, payez chacun votre part via Mobile Money. Invitation par lien WhatsApp." },
    ],
  }),
  component: TableePage,
});

type Participant = {
  id: string;
  name: string;
  initial: string;
  color: string;
  items: { name: string; price: number }[];
  paid: boolean;
};

const colors = [
  "from-orange-500 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-fuchsia-500 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-indigo-500",
  "from-rose-400 to-red-500",
];

function TableePage() {
  const [name] = useState("Anniv' de Sandra");
  const [restaurant] = useState("Chez Mama Biya");
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "1", name: "Sandra (toi)", initial: "S", color: colors[0], items: [{ name: "Poulet DG", price: 3500 }], paid: false },
    { id: "2", name: "Eric", initial: "E", color: colors[1], items: [{ name: "Poisson braisé", price: 4200 }], paid: true },
    { id: "3", name: "Aïcha", initial: "A", color: colors[2], items: [{ name: "Ndolé + plantain", price: 2800 }], paid: false },
    { id: "4", name: "Junior", initial: "J", color: colors[3], items: [{ name: "Suya x2", price: 3000 }], paid: false },
  ]);

  const inviteLink = "https://mboa.eats/t/sandra-anniv";
  const total = participants.reduce((s, p) => s + p.items.reduce((a, i) => a + i.price, 0), 0);
  const paidCount = participants.filter((p) => p.paid).length;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePaid = (id: string) => {
    setParticipants((p) => p.map((x) => (x.id === id ? { ...x, paid: !x.paid } : x)));
  };

  const removeParticipant = (id: string) => {
    setParticipants((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display text-sm font-semibold">Mode Tablée</span>
          <button className="rounded-full bg-gold/20 px-3 py-1.5 text-xs font-semibold text-gold">
            Live
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Exclusivité MboaEats
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{name}</h1>
        <p className="mt-1 text-muted-foreground">Tablée chez <span className="text-foreground font-medium">{restaurant}</span></p>

        {/* Invitation card */}
        <section className="mt-6 grid gap-4 rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-elevated p-5 shadow-card md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lien d'invitation</p>
            <p className="mt-1 truncate font-mono text-sm text-foreground">{inviteLink}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-surface-elevated"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Rejoins ma tablée MboaEats : ${inviteLink}`)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
            >
              <MessageCircle className="h-4 w-4" /> Partager WhatsApp
            </a>
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105">
              <Share2 className="h-4 w-4" /> Inviter
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          <Stat label="Invités" value={`${participants.length}/12`} icon={<Users className="h-4 w-4" />} />
          <Stat label="A payé" value={`${paidCount}/${participants.length}`} icon={<Check className="h-4 w-4" />} />
          <Stat label="Total tablée" value={`${total.toLocaleString("fr-FR")} F`} icon={<Crown className="h-4 w-4 text-gold" />} accent />
          <Stat label="Livraison" value="~30 min" icon={<Clock className="h-4 w-4" />} />
        </section>

        {/* Participants */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Participants</h2>
            <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-surface-elevated">
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {participants.map((p) => {
              const subtotal = p.items.reduce((a, i) => a + i.price, 0);
              return (
                <article key={p.id} className="group rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-primary/40">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${p.color} font-bold text-white shadow-card`}>
                      {p.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{p.name}</p>
                        {p.paid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                            <Check className="h-3 w-3" /> Payé
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                            En attente
                          </span>
                        )}
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {p.items.map((i) => (
                          <li key={i.name} className="flex justify-between gap-2">
                            <span>· {i.name}</span>
                            <span className="text-foreground">{i.price.toLocaleString("fr-FR")} F</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-display text-lg font-bold">{subtotal.toLocaleString("fr-FR")} F</p>
                      {!p.paid && (
                        <button
                          onClick={() => togglePaid(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                        >
                          <Smartphone className="h-3 w-3" /> Payer MoMo
                        </button>
                      )}
                      <button
                        onClick={() => removeParticipant(p.id)}
                        aria-label="Retirer"
                        className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Summary */}
        <section className="mt-8 rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">Tu paies pour</p>
              <p className="font-display text-2xl font-bold">Sandra · Poulet DG</p>
              <p className="text-sm opacity-90">3 500 FCFA · MTN MoMo · 691 ** ** 42</p>
            </div>
            <button className="rounded-full bg-background/20 px-6 py-3 text-sm font-bold backdrop-blur transition hover:bg-background/30">
              Confirmer mon paiement
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-card ${accent ? "border-gold/40 bg-gold/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
