import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Smartphone, CreditCard, Banknote, Check, Loader2, ShieldCheck,
  Lock, ChevronRight, Webhook, Phone, MapPin, Tag,
} from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({
    meta: [
      { title: "Paiement · MboaEats" },
      { name: "description", content: "Payez en MTN MoMo, Orange Money, carte bancaire ou cash à la livraison." },
    ],
  }),
});

type Method = "momo" | "orange" | "card" | "cash";
type Step = "choose" | "ussd" | "otp" | "card" | "success";

const cart = [
  { name: "Ndolé poisson", qty: 1, price: 2500 },
  { name: "Poulet DG", qty: 1, price: 3500 },
  { name: "Bissap maison", qty: 2, price: 800 },
];

function Checkout() {
  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const delivery = 800;
  const total = subtotal + delivery;
  const navigate = useNavigate();

  const [method, setMethod] = useState<Method>("momo");
  const [phone, setPhone] = useState("690 00 00 00");
  const [step, setStep] = useState<Step>("choose");
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(20);

  useEffect(() => {
    if (step !== "ussd" || !pending) return;
    if (seconds <= 0) { goToOtp(); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, pending, seconds]);

  const start = () => {
    if (method === "cash") return setStep("success");
    if (method === "card") return setStep("card");
    setStep("ussd");
    setPending(true);
    setSeconds(20);
  };

  const goToOtp = () => {
    setPending(false);
    setStep("otp");
  };

  const confirm = () => {
    setPending(false);
    setStep("success");
    setTimeout(() => navigate({ to: "/suivi" }), 1800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display font-bold">Paiement</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Sécurisé</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1.4fr_1fr] md:px-8">
        <section className="space-y-5">
          {step === "choose" && (
            <ChooseMethod method={method} setMethod={setMethod} phone={phone} setPhone={setPhone} onPay={start} total={total} />
          )}
          {step === "ussd" && (
            <UssdScreen method={method} phone={phone} pending={pending} seconds={seconds} total={total} onConfirm={goToOtp} />
          )}
          {step === "otp" && (
            <OtpScreen method={method} phone={phone} total={total} onConfirm={confirm} onBack={() => setStep("ussd")} />
          )}
          {step === "card" && <CardScreen total={total} onConfirm={confirm} />}
          {step === "success" && <SuccessScreen method={method} total={total} />}
        </section>

        <Summary cart={cart} subtotal={subtotal} delivery={delivery} total={total} />
      </main>
    </div>
  );
}

function ChooseMethod({
  method, setMethod, phone, setPhone, onPay, total,
}: { method: Method; setMethod: (m: Method) => void; phone: string; setPhone: (s: string) => void; onPay: () => void; total: number }) {
  return (
    <>
      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold">Livraison à</h2>
        </div>
        <p className="mt-1 text-sm">Akwa, Douala · Portail bleu derrière la pharmacie</p>
        <p className="mt-1 text-xs text-muted-foreground">Arrivée estimée : 25-30 min</p>
      </div>

      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <h2 className="font-display text-lg font-bold">Méthode de paiement</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PayOption id="momo" current={method} setCurrent={setMethod} title="MTN MoMo" subtitle="Confirmation auto via webhook" badge="Recommandé"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 font-display text-sm font-bold text-black">MTN</div>} />
          <PayOption id="orange" current={method} setCurrent={setMethod} title="Orange Money" subtitle="Paiement instantané"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-display text-xs font-bold text-white">Orange</div>} />
          <PayOption id="card" current={method} setCurrent={setMethod} title="Carte bancaire" subtitle="Visa, Mastercard"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary"><CreditCard className="h-5 w-5 text-primary-foreground" /></div>} />
          <PayOption id="cash" current={method} setCurrent={setMethod} title="Cash à la livraison" subtitle="Payez le livreur"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20"><Banknote className="h-5 w-5 text-gold" /></div>} />
        </div>

        {(method === "momo" || method === "orange") && (
          <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4 animate-fade-up">
            <label className="text-xs font-semibold text-muted-foreground">Numéro {method === "momo" ? "MTN MoMo" : "Orange Money"}</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background p-2">
              <span className="rounded-lg bg-surface px-3 py-2 text-sm font-bold">🇨🇲 +237</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="flex-1 bg-transparent px-2 py-2 text-base outline-none" />
            </div>
            <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-primary" /> Vous recevrez une notification USSD pour confirmer
            </p>
          </div>
        )}

        {method === "cash" && (
          <p className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm">
            <Banknote className="mr-1 inline h-4 w-4 text-gold" /> Préparez l'appoint si possible. Le livreur peut rendre la monnaie jusqu'à 5 000 FCFA.
          </p>
        )}
      </div>

      <button
        onClick={onPay}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01]"
      >
        Payer {total.toLocaleString("fr-FR")} FCFA <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}

function PayOption({ id, current, setCurrent, title, subtitle, icon, badge }: {
  id: Method; current: Method; setCurrent: (m: Method) => void; title: string; subtitle: string; icon: React.ReactNode; badge?: string;
}) {
  const active = current === id;
  return (
    <button
      onClick={() => setCurrent(id)}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-background/40 hover:border-primary/40"
      }`}
    >
      {icon}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{title}</p>
          {badge && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{badge}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`}>
        {active && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </button>
  );
}

function UssdScreen({ method, phone, pending, seconds, total, onConfirm }: {
  method: Method; phone: string; pending: boolean; seconds: number; total: number; onConfirm: () => void;
}) {
  const code = method === "momo" ? "*126#" : "#150*1#";
  const brand = method === "momo" ? "MTN MoMo" : "Orange Money";
  return (
    <div className="rounded-3xl border border-primary/40 bg-surface/60 p-6 shadow-glow animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Smartphone className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Confirmez sur votre téléphone</h2>
          <p className="text-xs text-muted-foreground">{brand} · +237 {phone}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background/50 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Composez ou attendez la pop-up</p>
        <p className="mt-1 font-display text-3xl font-extrabold text-gradient-primary tracking-widest">{code}</p>
        <p className="mt-3 text-sm">Confirmez le paiement de <span className="font-bold text-foreground">{total.toLocaleString("fr-FR")} FCFA</span> à <strong>MboaEats</strong>.</p>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-4">
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold">En attente de la confirmation…</p>
              <p className="text-xs text-muted-foreground">Webhook auto · Annule dans {seconds}s</p>
            </div>
          </>
        ) : (
          <p className="text-sm">Le webhook a expiré.</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Webhook className="h-3 w-3 text-primary" /> Confirmation automatique via API native MTN/Orange · Aucune saisie de PIN sur MboaEats
      </div>

      <button onClick={onConfirm} className="mt-5 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
        J'ai confirmé sur mon téléphone
      </button>
    </div>
  );
}

function CardScreen({ total, onConfirm }: { total: number; onConfirm: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSubmitting(true); setTimeout(onConfirm, 1200); }}
      className="rounded-3xl border border-border bg-surface/60 p-6 animate-fade-up"
    >
      <h2 className="font-display text-xl font-bold">Carte bancaire</h2>
      <p className="text-xs text-muted-foreground">Visa · Mastercard · 3D-Secure</p>

      <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-background to-gold/20 p-5 shadow-card">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex justify-between">
          <CreditCard className="h-7 w-7 text-foreground" />
          <span className="font-display text-sm font-bold tracking-widest">VISA</span>
        </div>
        <p className="relative mt-8 font-mono text-lg tracking-widest">•••• •••• •••• 4242</p>
        <div className="relative mt-3 flex justify-between text-xs text-muted-foreground">
          <span>TITULAIRE</span><span>EXP</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Field label="Numéro de carte" placeholder="4242 4242 4242 4242" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiration" placeholder="MM/AA" />
          <Field label="CVV" placeholder="123" />
        </div>
        <Field label="Titulaire" placeholder="Nom sur la carte" />
      </div>

      <button disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-60">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Payer {total.toLocaleString("fr-FR")} FCFA
      </button>
    </form>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input placeholder={placeholder} className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-3 text-sm outline-none focus:border-primary" />
    </label>
  );
}

function SuccessScreen({ method, total }: { method: Method; total: number }) {
  const label = method === "cash" ? "Commande confirmée" : "Paiement réussi";
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-10 text-center animate-scale-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
        <Check className="h-8 w-8 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold">{label} 🎉</h2>
      <p className="text-sm text-muted-foreground">
        {method === "cash"
          ? `Vous paierez ${total.toLocaleString("fr-FR")} FCFA au livreur à l'arrivée.`
          : `${total.toLocaleString("fr-FR")} FCFA débités · Reçu envoyé par SMS.`}
      </p>
      <Link to="/suivi" className="mt-3 rounded-2xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow">
        Suivre ma commande
      </Link>
    </div>
  );
}

function Summary({ cart, subtotal, delivery, total }: {
  cart: { name: string; qty: number; price: number }[]; subtotal: number; delivery: number; total: number;
}) {
  return (
    <aside className="rounded-3xl border border-border bg-surface/60 p-5 h-fit md:sticky md:top-20">
      <h3 className="font-display text-lg font-bold">Votre commande</h3>
      <p className="text-xs text-muted-foreground">Chez Mama Biya · Akwa</p>
      <ul className="mt-4 space-y-2 text-sm">
        {cart.map((i) => (
          <li key={i.name} className="flex justify-between">
            <span><span className="text-muted-foreground">{i.qty}×</span> {i.name}</span>
            <span>{(i.qty * i.price).toLocaleString("fr-FR")} F</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Sous-total</span><span>{subtotal.toLocaleString("fr-FR")} F</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Livraison</span><span>{delivery.toLocaleString("fr-FR")} F</span></div>
        <div className="flex justify-between font-display text-xl font-extrabold"><span>Total</span><span className="text-gradient-gold">{total.toLocaleString("fr-FR")} F</span></div>
      </div>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-gold/5 py-2 text-xs font-semibold text-gold">
        <Tag className="h-3 w-3" /> Ajouter un code promo
      </button>
    </aside>
  );
}
