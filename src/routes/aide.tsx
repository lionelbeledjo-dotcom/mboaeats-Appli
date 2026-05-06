import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, LifeBuoy, Mail, Phone, MessageCircle, Search, ChevronDown,
  CreditCard, Bike, Utensils, ShieldCheck, Send, MapPin, Clock,
} from "lucide-react";

export const Route = createFileRoute("/aide")({
  component: Aide,
  head: () => ({
    meta: [
      { title: "Centre d'aide · MboaEats" },
      { name: "description", content: "FAQ, contact direct et support MboaEats. Email : lionelbrown2728@yahoo.fr" },
    ],
  }),
});

const SUPPORT_EMAIL = "lionelbrown2728@yahoo.fr";
const SUPPORT_PHONE = "+237 6 90 00 00 00";
const WHATSAPP = "237690000000";

const categories = [
  { icon: CreditCard, label: "Paiement", color: "from-primary/20 to-primary/5" },
  { icon: Bike, label: "Livraison", color: "from-gold/20 to-gold/5" },
  { icon: Utensils, label: "Commande", color: "from-emerald-500/20 to-emerald-500/5" },
  { icon: ShieldCheck, label: "Compte & sécurité", color: "from-blue-500/20 to-blue-500/5" },
];

const faqs = [
  {
    q: "Comment payer avec MTN MoMo ou Orange Money ?",
    a: "Au moment du paiement, sélectionnez MTN MoMo ou Orange Money, entrez votre numéro Cameroun (+237) et confirmez la pop-up USSD reçue sur votre téléphone. La validation est automatique via webhook — aucune saisie de code PIN sur MboaEats.",
  },
  {
    q: "Le paiement Mobile Money n'a pas abouti, que faire ?",
    a: "Vérifiez votre solde et que votre compte n'est pas bloqué. Vous pouvez réessayer immédiatement ou choisir Cash à la livraison comme alternative. Tout débit non confirmé est remboursé sous 24h.",
  },
  {
    q: "Puis-je payer en cash à la livraison ?",
    a: "Oui, le paiement Cash est disponible dans les 3 villes. Préparez l'appoint si possible — le livreur peut rendre la monnaie jusqu'à 5 000 FCFA.",
  },
  {
    q: "Combien de temps pour la livraison ?",
    a: "En moyenne 25 minutes à Douala, Yaoundé et Bafoussam. L'ETA exact s'affiche en temps réel sur la page Suivi.",
  },
  {
    q: "Comment annuler ou modifier ma commande ?",
    a: "Vous pouvez annuler gratuitement tant que le restaurant n'a pas commencé la préparation. Au-delà, contactez le support directement via le bouton WhatsApp ci-dessous.",
  },
  {
    q: "Mon plat est arrivé froid ou incorrect, que faire ?",
    a: "Ouvrez un litige depuis l'historique de commande. Notre équipe rembourse en moyenne sous 2h ouvrables (du lundi au dimanche, 8h-22h).",
  },
];

function Aide() {
  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  const filtered = faqs.filter((f) => f.q.toLowerCase().includes(query.toLowerCase()) || f.a.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
          <span className="font-display font-bold">Centre d'aide</span>
          <div className="w-16" />
        </div>
      </header>

      <section className="bg-gradient-hero noise">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center md:px-8 md:py-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
            <LifeBuoy className="h-3.5 w-3.5" /> Support 7j/7 · 8h-22h
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
            Comment pouvons-nous <span className="text-gradient-primary">vous aider</span> ?
          </h1>
          <p className="mt-3 text-muted-foreground">Une équipe au Cameroun, prête à répondre en français et en pidgin.</p>

          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-surface/80 p-2 shadow-card backdrop-blur">
            <Search className="ml-3 h-5 w-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans l'aide…"
              className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 md:px-8">
        {/* Categories */}
        <section>
          <h2 className="font-display text-xl font-bold">Parcourez par catégorie</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <button key={c.label} className={`rounded-2xl border border-border bg-gradient-to-br ${c.color} p-5 text-left transition hover:border-primary/40 hover:shadow-glow`}>
                <c.icon className="h-6 w-6" />
                <p className="mt-3 font-display font-bold">{c.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Direct contact */}
        <section className="grid gap-4 md:grid-cols-3">
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Bonjour MboaEats, j'ai besoin d'aide.")}`}
            target="_blank" rel="noreferrer"
            className="group rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-5 transition hover:border-emerald-400 hover:shadow-glow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display font-bold">WhatsApp</h3>
            <p className="text-xs text-muted-foreground">Réponse en moins de 5 min</p>
            <p className="mt-3 text-sm font-semibold text-emerald-300 group-hover:underline">Démarrer une conversation →</p>
          </a>

          <a
            href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
            className="group rounded-3xl border border-border bg-surface/60 p-5 transition hover:border-primary hover:shadow-glow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Phone className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="mt-3 font-display font-bold">Appel direct</h3>
            <p className="text-xs text-muted-foreground">7j/7 · 8h-22h</p>
            <p className="mt-3 text-sm font-semibold group-hover:text-primary">{SUPPORT_PHONE}</p>
          </a>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Demande de support MboaEats")}`}
            className="group rounded-3xl border border-gold/40 bg-gold/5 p-5 transition hover:border-gold hover:shadow-glow"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-gold">
              <Mail className="h-5 w-5 text-gold-foreground" />
            </div>
            <h3 className="mt-3 font-display font-bold">Email support</h3>
            <p className="text-xs text-muted-foreground">Réponse sous 24h ouvrées</p>
            <p className="mt-3 break-all text-sm font-semibold text-gold group-hover:underline">{SUPPORT_EMAIL}</p>
          </a>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-display text-xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface/60">
            {filtered.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-background/30"
                  >
                    <span className="font-semibold">{f.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-muted-foreground animate-fade-up">{f.a}</div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">Aucun résultat. Contactez-nous directement par WhatsApp ou email.</p>
            )}
          </div>
        </section>

        {/* Contact form */}
        <section className="rounded-3xl border border-border bg-surface/60 p-6 md:p-8">
          <h2 className="font-display text-xl font-bold">Envoyer un message à l'équipe</h2>
          <p className="text-sm text-muted-foreground">Nous vous répondons à l'adresse email indiquée.</p>

          <ContactForm />
        </section>

        {/* Footer info */}
        <section className="grid gap-3 sm:grid-cols-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Douala · Yaoundé · Bafoussam</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Support 7j/7 · 8h-22h</div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gold" /> {SUPPORT_EMAIL}</div>
        </section>
      </main>
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Demande de support MboaEats");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `${message}\n\n— Envoyé par ${name || "Anonyme"} (${email || "sans email"})`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2">
      <Input label="Nom" value={name} onChange={setName} placeholder="Votre nom" />
      <Input label="Email" value={email} onChange={setEmail} placeholder="vous@exemple.cm" type="email" />
      <Input label="Sujet" value={subject} onChange={setSubject} placeholder="Sujet" wide />
      <label className="md:col-span-2">
        <span className="text-xs font-semibold text-muted-foreground">Message</span>
        <textarea
          value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={2000}
          rows={5} placeholder="Décrivez votre besoin…"
          className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-3 text-sm outline-none focus:border-primary"
        />
      </label>
      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {sent ? "✅ Votre client mail s'est ouvert. Sinon, écrivez à " : "Envoie un email à "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-gold hover:underline">{SUPPORT_EMAIL}</a>
        </p>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]">
          <Send className="h-4 w-4" /> Envoyer
        </button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", wide }: {
  label: string; value: string; onChange: (s: string) => void; placeholder: string; type?: string; wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        maxLength={255}
        className="mt-1 w-full rounded-xl border border-border bg-background/50 px-3 py-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
