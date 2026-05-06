import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Crown, Check, Truck, Sparkles, Zap, Shield, Loader2, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initiatePayment, verifyPayment, activateMboaPass, getActiveMboaPass } from "@/server/payments.functions";

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
  { id: "month" as const, label: "Mensuel", price: 2500, sub: "/ mois", best: false },
  { id: "year" as const, label: "Annuel", price: 22000, sub: "/ an · -27%", best: true },
];

const benefits = [
  { icon: Truck, label: "Livraison gratuite illimitée à Douala & Yaoundé" },
  { icon: Sparkles, label: "-10% sur tous les restaurants partenaires" },
  { icon: Zap, label: "Préparation prioritaire (Mboa Express)" },
  { icon: Shield, label: "Support VIP 7j/7 via WhatsApp" },
  { icon: Crown, label: "Doubles points Mboa Gold à chaque commande" },
];

type Step = "intro" | "phone" | "otp" | "done";

function MboaPassPage() {
  const initiate = useServerFn(initiatePayment);
  const verify = useServerFn(verifyPayment);
  const activate = useServerFn(activateMboaPass);
  const fetchPass = useServerFn(getActiveMboaPass);

  const [plan, setPlan] = useState<"month" | "year">("year");
  const [step, setStep] = useState<Step>("intro");
  const [provider, setProvider] = useState<"momo" | "orange">("momo");
  const [phone, setPhone] = useState("690000000");
  const [otp, setOtp] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<{ plan: string; ends_at: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const r = await fetchPass({ data: { userId: user.id } });
      if (r.active && r.sub) setActive({ plan: r.sub.plan, ends_at: r.sub.ends_at });
    })();
  }, [fetchPass]);

  const price = plans.find((p) => p.id === plan)!.price;

  const startPurchase = () => {
    if (!userId) { setErr("Connecte-toi pour souscrire."); return; }
    setStep("phone");
    setErr(null);
  };

  const sendOtp = async () => {
    setErr(null); setLoading(true);
    try {
      const cleanMsisdn = phone.replace(/\D/g, "");
      const r = await initiate({
        data: { provider, msisdn: `237${cleanMsisdn}`, amount: price, purpose: `mboapass_${plan}` },
      });
      if (!r.ok) throw new Error(r.error ?? "Échec d'initiation");
      setReference(r.reference);
      setHint(r.hint ?? null);
      setStep("otp");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  const confirmOtp = async () => {
    if (!reference || !userId) return;
    setLoading(true); setErr(null);
    try {
      const v = await verify({ data: { reference, otp } });
      if (!v.ok) throw new Error(v.error ?? "OTP invalide");
      const a = await activate({ data: { userId, plan, reference } });
      if (!a.ok) throw new Error(a.error ?? "Activation échouée");
      setActive({ plan, ends_at: a.ends_at! });
      setStep("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur");
      setOtp("");
    } finally { setLoading(false); }
  };

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
        {active && step !== "done" && (
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">
            <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-gold" /><strong className="text-gold">Membre Premium</strong></div>
            <p className="mt-1 text-muted-foreground">Plan {active.plan === "year" ? "annuel" : "mensuel"} — actif jusqu'au {new Date(active.ends_at).toLocaleDateString("fr-FR")}</p>
          </div>
        )}

        <section className="rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/15 via-primary/10 to-transparent p-6 text-center shadow-glow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold">Livraison <span className="text-gradient-primary">illimitée</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">Économise jusqu'à 24 000 FCFA / an sur tes frais de livraison.</p>
        </section>

        {step === "intro" && (
          <>
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Choisis ta formule</p>
              <div className="grid grid-cols-2 gap-3">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`relative rounded-2xl border p-4 text-left transition ${
                      plan === p.id ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface/60"
                    }`}
                  >
                    {p.best && (
                      <span className="absolute -top-2 right-3 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Populaire</span>
                    )}
                    <p className="text-xs text-muted-foreground">{p.label}</p>
                    <p className="mt-1 font-display text-xl font-bold">{p.price.toLocaleString("fr-FR")} F</p>
                    <p className="text-[11px] text-muted-foreground">{p.sub}</p>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tes avantages</p>
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

            {err && <p className="text-sm text-destructive">{err}</p>}
            <button onClick={startPurchase} className="block w-full rounded-full bg-gradient-primary py-4 text-center text-base font-bold text-primary-foreground shadow-glow transition hover:scale-[1.01]">
              Activer MboaPass — {price.toLocaleString("fr-FR")} FCFA
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Paiement sécurisé via MTN MoMo ou Orange Money. Annulable à tout moment.
            </p>
          </>
        )}

        {step === "phone" && (
          <section className="space-y-4 rounded-3xl border border-border bg-surface/60 p-5">
            <h3 className="font-display text-lg font-bold">Paiement {price.toLocaleString("fr-FR")} FCFA</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setProvider("momo")} className={`rounded-xl border p-3 text-sm font-bold ${provider === "momo" ? "border-primary bg-primary/10" : "border-border"}`}>MTN MoMo</button>
              <button onClick={() => setProvider("orange")} className={`rounded-xl border p-3 text-sm font-bold ${provider === "orange" ? "border-primary bg-primary/10" : "border-border"}`}>Orange Money</button>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Numéro</span>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background p-2">
                <span className="rounded-lg bg-surface px-3 py-2 text-sm font-bold">🇨🇲 +237</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="flex-1 bg-transparent px-2 py-2 text-base outline-none" />
              </div>
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button disabled={loading} onClick={sendOtp} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Recevoir le code
            </button>
          </section>
        )}

        {step === "otp" && (
          <section className="space-y-4 rounded-3xl border border-primary/40 bg-surface/60 p-5 shadow-glow">
            <h3 className="font-display text-lg font-bold">Code OTP</h3>
            <p className="text-sm text-muted-foreground">Entre les 6 chiffres reçus par SMS.</p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              className="w-full rounded-xl border border-border bg-background p-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary"
              placeholder="••••••"
            />
            {hint && <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] text-amber-200">⚙️ {hint}</p>}
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button disabled={loading || otp.length < 6} onClick={confirmOtp} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmer
            </button>
          </section>
        )}

        {step === "done" && (
          <section className="flex flex-col items-center gap-3 rounded-3xl border border-gold/40 bg-gold/10 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
              <Crown className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="font-display text-2xl font-bold">Bienvenue dans MboaPass 👑</h3>
            <p className="text-sm text-muted-foreground">Livraison offerte à toutes tes prochaines commandes.</p>
            <Link to="/" className="mt-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow">
              Commander maintenant
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
