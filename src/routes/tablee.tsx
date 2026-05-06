import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users, Copy, Check, Share2, Plus, Trash2, Crown, MessageCircle,
  Smartphone, Clock, ArrowLeft, Sparkles, Tag, X, Loader2, ShieldCheck,
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

  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<"otp" | "loading" | "done">("otp");
  const [otp, setOtp] = useState("");
  const [otpErr, setOtpErr] = useState<string | null>(null);

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
    setPayStep("otp");
    setOtp("");
    setOtpErr(null);
    setPayOpen(true);
  };

  const submitOtp = () => {
    if (otp.length < 4) { setOtpErr("Code à 4-6 chiffres"); return; }
    setPayStep("loading");
    setTimeout(() => {
      setPayStep("done");
      setParticipants((p) => p.map((x) => (x.id === "1" ? { ...x, paid: true } : x)));
      setTimeout(() => setPayOpen(false), 1400);
    }, 1200);
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

        {/* Modal paiement */}
        {payOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={() => payStep !== "loading" && setPayOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl border border-border bg-card p-6 shadow-card sm:rounded-3xl animate-fade-up">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">Confirmer le paiement</h3>
                <button onClick={() => payStep !== "loading" && setPayOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>

              {payStep === "otp" && (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Un code OTP a été envoyé au <span className="text-foreground font-medium">691 ** ** 42</span> via MTN MoMo.
                  </p>
                  <div className="mt-4 rounded-2xl border border-border bg-surface/60 p-4 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>Ta part</span><span>{mySubtotal.toLocaleString("fr-FR")} F</span></div>
                    {promo && <div className="flex justify-between text-primary"><span>Promo {promo.code}</span><span>−{promo.discount.toLocaleString("fr-FR")} F</span></div>}
                    <div className="mt-1 flex justify-between font-display text-lg font-bold"><span>Total</span><span>{myTotal.toLocaleString("fr-FR")} F</span></div>
                  </div>
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setOtpErr(null); }}
                    placeholder="• • • • • •"
                    className="mt-4 w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-center font-display text-2xl tracking-[0.5em] outline-none focus:border-primary"
                  />
                  {otpErr && <p className="mt-2 text-xs text-destructive">{otpErr}</p>}
                  <button
                    onClick={submitOtp}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
                  >
                    Valider le paiement
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-primary" /> Démo : saisis n'importe quel code à 4-6 chiffres
                  </p>
                </>
              )}

              {payStep === "loading" && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Confirmation en cours…</p>
                </div>
              )}

              {payStep === "done" && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <Check className="h-7 w-7" />
                  </div>
                  <p className="font-display text-lg font-bold">Paiement confirmé</p>
                  <p className="text-sm text-muted-foreground">Ta part de {myTotal.toLocaleString("fr-FR")} F a été réglée.</p>
                </div>
              )}
            </div>
          </div>
        )}
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
