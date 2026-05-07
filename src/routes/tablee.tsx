import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users, Copy, Check, Share2, Plus, Trash2, Crown, MessageCircle,
  Smartphone, Clock, ArrowLeft, Sparkles, Tag,
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
  const [mismatch, setMismatch] = useState<{ otpTotal: number; currentTotal: number } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "1", name: "Sandra (toi)", initial: "S", color: colors[0], items: [{ name: "Poulet DG", price: 3500 }], paid: false },
    { id: "2", name: "Eric", initial: "E", color: colors[1], items: [{ name: "Poisson braisé", price: 4200 }], paid: true },
    { id: "3", name: "Aïcha", initial: "A", color: colors[2], items: [{ name: "Ndolé + plantain", price: 2800 }], paid: false },
    { id: "4", name: "Junior", initial: "J", color: colors[3], items: [{ name: "Suya x2", price: 3000 }], paid: false },
  ]);

  const inviteLink = "https://mboa.eats/t/sandra-anniv";
  const totalRaw = participants.reduce((s, p) => s + p.items.reduce((a, i) => a + i.price, 0), 0);
  const paidCount = participants.filter((p) => p.paid).length;

  // Promo + paiement perso
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoErr, setPromoErr] = useState<string | null>(null);
  const PROMOS: Record<string, number> = { MBOA10: 350, BIENVENUE: 1000, TABLEE: 500 };

  const me = participants.find((p) => p.id === "1");
  const mySubtotal = me ? me.items.reduce((a, i) => a + i.price, 0) : 0;
  const myTotal = Math.max(0, mySubtotal - (promo?.discount ?? 0));
  const total = totalRaw;

  const navigate = useNavigate();

  // Au retour de /tablee/paiement, vérifier que le total OTP correspond au total actuel
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tablee:lastPaid");
      if (!raw) return;
      sessionStorage.removeItem("tablee:lastPaid");
      const data = JSON.parse(raw) as { amount?: number; at?: number };
      if (!data?.at || Date.now() - data.at > 5 * 60 * 1000) return;

      const currentTotal = Math.max(0, mySubtotal - (promo?.discount ?? 0));
      const otpTotal = data.amount ?? -1;

      if (otpTotal !== currentTotal) {
        // Total désynchronisé (promo modifiée pendant l'OTP) → refus
        setMismatch({ otpTotal, currentTotal });
        return;
      }

      setParticipants((list) =>
        list.map((p) => (p.id === "1" ? { ...p, paid: true } : p)),
      );
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPromo = () => {
    const k = promoCode.trim().toUpperCase();
    if (!k) { setPromoErr("Saisis un code"); return; }
    const d = PROMOS[k];
    if (!d) { setPromoErr("Code promo invalide"); return; }
    setPromo({ code: k, discount: d });
    setPromoCode("");
    setPromoErr(null);
    setPromoOpen(false);
  };

  const openPayment = () => {
    if (!me) return;
    navigate({
      to: "/tablee/paiement",
      search: {
        participant: me.name,
        item: me.items[0]?.name ?? "",
        amount: mySubtotal,
        discount: promo?.discount ?? 0,
        promo: promo?.code,
        msisdn: "691 ** ** 42",
      },
    });
  };

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

        {mismatch && (
          <div role="alert" className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <div>
              <p className="font-semibold">Paiement non appliqué — total désynchronisé</p>
              <p className="mt-1 text-xs opacity-90">
                OTP validé pour <strong>{mismatch.otpTotal.toLocaleString("fr-FR")} F</strong>, mais le total actuel est <strong>{mismatch.currentTotal.toLocaleString("fr-FR")} F</strong> (promo modifiée). Relance la validation pour confirmer le bon montant.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setMismatch(null); openPayment(); }} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-black hover:bg-amber-300">Nouvelle validation</button>
              <button onClick={() => setMismatch(null)} className="rounded-full border border-amber-400/50 px-3 py-2 text-xs font-semibold">Ignorer</button>
            </div>
          </div>
        )}

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
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider opacity-80">Tu paies pour</p>
              <p className="font-display text-2xl font-bold truncate">{me?.name ?? "—"} · {me?.items[0]?.name ?? ""}</p>
              <p className="text-sm opacity-90">
                {myTotal.toLocaleString("fr-FR")} FCFA · MTN MoMo · 691 ** ** 42
                {promo && <span className="ml-2 rounded-full bg-background/25 px-2 py-0.5 text-xs">−{promo.discount.toLocaleString("fr-FR")} F ({promo.code})</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={openPayment}
              disabled={!me || me.paid}
              className="rounded-full bg-background/20 px-6 py-3 text-sm font-bold backdrop-blur transition hover:bg-background/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {me?.paid ? "✓ Payé" : "Confirmer mon paiement"}
            </button>
          </div>

          {/* Promo */}
          <div className="mt-4 border-t border-primary-foreground/20 pt-4">
            {promo ? (
              <div className="flex items-center justify-between rounded-xl bg-background/15 px-3 py-2 text-xs">
                <span className="font-semibold">✓ Code {promo.code} appliqué</span>
                <button type="button" onClick={() => setPromo(null)} className="opacity-80 hover:opacity-100">Retirer</button>
              </div>
            ) : !promoOpen ? (
              <button
                type="button"
                onClick={() => setPromoOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 bg-background/10 px-4 py-2 text-xs font-semibold backdrop-blur transition hover:bg-background/20"
              >
                <Tag className="h-3.5 w-3.5" /> Ajouter un code promo
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  autoFocus
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoErr(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") applyPromo(); }}
                  placeholder="MBOA10"
                  className="flex-1 rounded-xl bg-background/20 px-3 py-2 text-sm uppercase tracking-wider text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:bg-background/30"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={applyPromo} className="rounded-xl bg-background px-4 py-2 text-xs font-bold text-foreground">Appliquer</button>
                  <button type="button" onClick={() => { setPromoOpen(false); setPromoCode(""); setPromoErr(null); }} className="rounded-xl border border-primary-foreground/40 px-3 py-2 text-xs">Annuler</button>
                </div>
              </div>
            )}
            {promoErr && <p className="mt-2 text-xs font-semibold text-amber-200">{promoErr}</p>}
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
