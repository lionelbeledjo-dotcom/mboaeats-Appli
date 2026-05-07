import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Crown, Flame, Gift, Sparkles, Trophy, Lock, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyLoyalty } from "@/server/account.functions";

export const Route = createFileRoute("/fidelite")({
  component: Fidelite,
  head: () => ({
    meta: [
      { title: "Mboa Points · Fidélité gamifiée" },
      { name: "description", content: "Gagnez des Mboa Points et grimpez les niveaux : Pistache, Chef Ndolé, Roi du Mboa." },
    ],
  }),
});

const tiers = [
  { name: "Pistache", icon: "🥜", from: 0, perks: ["Livraison standard", "Promos hebdo"], color: "from-emerald-400/30 to-emerald-600/10" },
  { name: "Soya Boy", icon: "🍢", from: 800, perks: ["-15% sur le Soya", "Livraison réduite", "Accès promos flash"], color: "from-amber-400/30 to-amber-600/10" },
  { name: "Chef Ndolé", icon: "👨‍🍳", from: 2500, perks: ["Livraison -50%", "Plat surprise offert /mois", "Support prioritaire"], color: "from-orange-400/30 to-primary/10" },
  { name: "Roi du Mboa", icon: "👑", from: 6000, perks: ["Livraison illimitée", "Accès Tablée VIP", "Cadeaux partenaires", "Concierge culinaire"], color: "from-yellow-400/30 to-gold/10" },
];

function Fidelite() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<{ points: number; currentTier: string; nextTier: string; nextThreshold: number; pct: number; orders30: number } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: u }) => {
      if (u.user) {
        setAuthed(true);
        try { setData(await getMyLoyalty()); } catch {}
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const points = data?.points ?? 0;
  const currentTier = tiers.find((t) => t.name === data?.currentTier) ?? tiers[0];
  const nextTier = tiers.find((t) => t.name === data?.nextTier) ?? tiers[1];
  const pct = data?.pct ?? 0;
  const orders30 = data?.orders30 ?? 0;

  const quests: { label: string; reward: number; progress: number; total: number; done?: boolean }[] = [
    { label: "Commander 3 fois ce mois-ci", reward: 300, progress: Math.min(orders30, 3), total: 3, done: orders30 >= 3 },
    { label: "Inviter un ami à la Tablée", reward: 500, progress: 0, total: 1 },
    { label: "Tester un nouveau resto", reward: 200, progress: orders30 > 0 ? 1 : 0, total: 1, done: orders30 > 0 },
  ];

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-card">
          <Crown className="mx-auto h-8 w-8 text-gold" />
          <h1 className="mt-3 font-display text-xl font-bold">Mboa Points</h1>
          <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour suivre votre fidélité.</p>
          <Link to="/connexion" className="mt-4 inline-flex w-full justify-center rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Se connecter</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/profil" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Mon compte
          </Link>
          <span className="font-display font-bold">Mboa <span className="text-gradient-gold">Points</span></span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8">
        {/* Wallet card */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-surface via-background to-surface p-6 shadow-card md:p-8">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/30 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Solde fidélité</p>
              <p className="mt-2 font-display text-5xl font-extrabold text-gradient-gold">{points.toLocaleString("fr-FR")}</p>
              <p className="text-sm text-muted-foreground">Mboa Points</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2">
              <span className="text-2xl">{currentTier.icon}</span>
              <div>
                <p className="text-xs text-muted-foreground">Niveau actuel</p>
                <p className="font-semibold">{currentTier.name}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentTier.name}</span>
              <span>{nextTier.from - points} pts pour <strong className="text-gold">{nextTier.name}</strong></span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-gold shadow-glow" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section>
          <h2 className="font-display text-xl font-bold">Vos niveaux</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t, i) => {
              const unlocked = points >= t.from;
              const isCurrent = currentTier.name === t.name;
              return (
                <div
                  key={t.name}
                  className={`relative overflow-hidden rounded-3xl border p-5 ${isCurrent ? "border-gold shadow-glow" : "border-border"} bg-gradient-to-br ${t.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{t.icon}</span>
                    {unlocked ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">Débloqué</span>
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">À partir de {t.from.toLocaleString("fr-FR")} pts</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quests */}
        <section>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            <h2 className="font-display text-xl font-bold">Quêtes du moment</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {quests.map((q) => {
              const pct = Math.min(100, (q.progress / q.total) * 100);
              return (
                <div key={q.label} className={`rounded-2xl border p-4 ${q.done ? "border-primary/40 bg-primary/5" : "border-border bg-surface/60"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{q.label}</p>
                    <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                      <Sparkles className="h-3 w-3" /> +{q.reward}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{q.progress}/{q.total} complété</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Rewards */}
        <section>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Boutique des récompenses</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { name: "Livraison offerte", cost: 500, icon: "🛵" },
              { name: "Beignets surprise", cost: 800, icon: "🥯" },
              { name: "-30% Tablée", cost: 1200, icon: "🍽️" },
              { name: "Plat signature", cost: 2500, icon: "👑" },
            ].map((r) => {
              const can = points >= r.cost;
              return (
                <button key={r.name} disabled={!can} className={`group flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${can ? "border-border bg-surface/60 hover:border-primary hover:shadow-glow" : "border-border bg-surface/30 opacity-60"}`}>
                  <span className="text-3xl">{r.icon}</span>
                  <span className="text-sm font-semibold">{r.name}</span>
                  <span className="flex items-center gap-1 text-xs text-gold"><Flame className="h-3 w-3" /> {r.cost} pts</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
