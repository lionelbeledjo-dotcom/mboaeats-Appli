import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Gift, Copy, Check, Share2, Users, Wallet, Loader2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyReferral, applyMyReferralCode } from "@/lib/loyalty.functions";

export const Route = createFileRoute("/parrainage")({
  head: () => ({
    meta: [
      { title: "Parrainage — MboaEats" },
      { name: "description", content: "Gagnez 500 FCFA par ami parrainé sur MboaEats." },
    ],
  }),
  component: ParrainagePage,
});

type ReferralData = Awaited<ReturnType<typeof getMyReferral>>;

function ParrainagePage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const reload = async () => {
    try { setData(await getMyReferral()); } catch { /* ignore */ }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: u }) => {
      if (u.user) {
        setAuthed(true);
        await reload();
      }
      setLoading(false);
    });
  }, []);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      await applyMyReferralCode({ data: { code: code.trim() } });
      setMsg({ tone: "ok", text: "Code appliqué ! Le bonus sera crédité à votre 1ʳᵉ commande payée." });
      setCode("");
      await reload();
    } catch (err: any) {
      const map: Record<string, string> = {
        already_referred: "Vous avez déjà appliqué un code de parrainage.",
        invalid_code: "Code invalide.",
        self_referral: "Vous ne pouvez pas utiliser votre propre code.",
        too_late: "Trop tard : vous avez déjà passé une commande payée.",
        not_authenticated: "Connectez-vous d'abord.",
      };
      const k = (err?.message ?? "").toLowerCase();
      const hit = Object.keys(map).find((m) => k.includes(m));
      setMsg({ tone: "err", text: hit ? map[hit] : "Impossible d'appliquer le code." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-card">
          <Gift className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 font-display text-xl font-bold">Parrainage MboaEats</h1>
          <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour récupérer votre code unique.</p>
          <button onClick={() => nav({ to: "/connexion" })} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-glow">
            <Crown className="h-5 w-5" /> Se connecter
          </button>
        </div>
      </div>
    );
  }

  const SHARE_TEXT = data
    ? `Salut ! Rejoins-moi sur MboaEats 🍲 et reçois 500 FCFA de bienvenue avec mon code ${data.code} : ${data.shareUrl}`
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <Link to="/profil" aria-label="Retour" className="rounded-full border border-border bg-surface/60 p-2"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="font-display text-lg font-bold">Parrainage</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        <section className="rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent p-6 text-center shadow-glow">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Gift className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold">
            Gagnez <span className="text-gradient-primary">500 FCFA</span> par ami
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Et offrez-leur 500 FCFA de bienvenue sur leur 1ʳᵉ commande payée.</p>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Votre code unique</p>
          <div className="rounded-2xl border-2 border-dashed border-primary/60 bg-surface/60 p-5 text-center">
            <p className="font-display text-2xl font-bold tracking-widest text-primary">{data?.code ?? "—"}</p>
            <button onClick={copy} className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
              {copied ? <><Check className="h-4 w-4" /> Copié</> : <><Copy className="h-4 w-4" /> Copier le code</>}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <a href={`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
            <Share2 className="mx-auto h-5 w-5 text-emerald-400" />
            <p className="mt-2 text-sm font-semibold">Partager WhatsApp</p>
          </a>
          <a href={`sms:?&body=${encodeURIComponent(SHARE_TEXT)}`} className="rounded-2xl border border-border bg-surface/60 p-4 text-center">
            <Share2 className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">Envoyer par SMS</p>
          </a>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vos statistiques</p>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Users} label="Amis parrainés" value={String((data?.rewardedCount ?? 0) + (data?.pendingCount ?? 0))} sub={`${data?.pendingCount ?? 0} en attente`} />
            <Stat icon={Wallet} label="Total gagné" value={`${(data?.totalEarned ?? 0).toLocaleString("fr-FR")} F`} />
          </div>
        </section>

        {!data?.myReferrer && (
          <section className="rounded-2xl border border-border bg-surface/60 p-4">
            <p className="font-semibold">Vous avez un code parrain ?</p>
            <p className="mt-1 text-xs text-muted-foreground">Saisissez-le avant votre 1ʳᵉ commande pour recevoir 500 FCFA de bienvenue.</p>
            <form onSubmit={submitCode} className="mt-3 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="MBOA-XXXXXX"
                maxLength={20}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-mono"
              />
              <button disabled={submitting || code.length < 4} className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
              </button>
            </form>
            {msg && <p className={`mt-2 text-xs ${msg.tone === "ok" ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
          </section>
        )}

        {data?.myReferrer && (
          <section className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">Code parrain appliqué : <span className="font-mono">{data.myReferrer.code}</span></p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.myReferrer.status === "rewarded"
                ? "Bonus de bienvenue déjà crédité 🎉"
                : "Le bonus sera crédité à votre 1ʳᵉ commande payée."}
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-surface/60 p-4 text-sm">
          <p className="font-semibold">Comment ça marche</p>
          <ol className="mt-2 space-y-2 text-muted-foreground">
            <li>1. Partagez votre code à vos amis.</li>
            <li>2. Ils s'inscrivent et passent leur 1ʳᵉ commande payée.</li>
            <li>3. Vous recevez 500 FCFA crédités sur votre wallet.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
