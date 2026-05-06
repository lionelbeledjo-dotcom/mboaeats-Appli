import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Gift, Copy, Check, Share2, Users, Wallet } from "lucide-react";

export const Route = createFileRoute("/parrainage")({
  head: () => ({
    meta: [
      { title: "Parrainage — MboaEats" },
      { name: "description", content: "Gagnez 500 FCFA par ami parrainé sur MboaEats." },
    ],
  }),
  component: ParrainagePage,
});

const REFERRAL_CODE = "MBOA-LB2728";
const SHARE_URL = "https://mboaeats.app/invite/MBOA-LB2728";
const SHARE_TEXT = `Salut ! Rejoins-moi sur MboaEats 🍲 et reçois 500 FCFA de bienvenue avec mon code ${REFERRAL_CODE} : ${SHARE_URL}`;

function ParrainagePage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <Link to="/profil" aria-label="Retour" className="rounded-full border border-border bg-surface/60 p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
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
          <p className="mt-1 text-sm text-muted-foreground">
            Et offrez-leur 500 FCFA de bienvenue sur leur 1ʳᵉ commande.
          </p>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Votre code unique</p>
          <div className="rounded-2xl border-2 border-dashed border-primary/60 bg-surface/60 p-5 text-center">
            <p className="font-display text-2xl font-bold tracking-widest text-primary">{REFERRAL_CODE}</p>
            <button
              onClick={copy}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
            >
              {copied ? <><Check className="h-4 w-4" /> Copié</> : <><Copy className="h-4 w-4" /> Copier le code</>}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center transition hover:scale-[1.02]"
          >
            <Share2 className="mx-auto h-5 w-5 text-emerald-400" />
            <p className="mt-2 text-sm font-semibold">Partager WhatsApp</p>
          </a>
          <a
            href={`sms:?&body=${encodeURIComponent(SHARE_TEXT)}`}
            className="rounded-2xl border border-border bg-surface/60 p-4 text-center transition hover:scale-[1.02]"
          >
            <Share2 className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">Envoyer par SMS</p>
          </a>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vos statistiques</p>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Users} label="Amis parrainés" value="3" />
            <Stat icon={Wallet} label="Total gagné" value="1 500 F" />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface/60 p-4 text-sm">
          <p className="font-semibold">Comment ça marche</p>
          <ol className="mt-2 space-y-2 text-muted-foreground">
            <li>1. Partagez votre code à vos amis.</li>
            <li>2. Ils s'inscrivent et passent leur 1ʳᵉ commande (min. 3 000 FCFA).</li>
            <li>3. Vous recevez 500 FCFA crédités sur votre prochaine commande.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
