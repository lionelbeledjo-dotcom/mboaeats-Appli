import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft, CreditCard, Bike, Utensils, ShieldCheck, MessageCircle, Phone, Mail, ChevronDown,
} from "lucide-react";
import { useState } from "react";

const SUPPORT_EMAIL = "lionelbrown2728@yahoo.fr";
const SUPPORT_PHONE = "+33 6 60 06 17 23";
const SUPPORT_PHONE_INTL = "+33660061723";
const WHATSAPP = "33660061723";

type Cat = {
  slug: string;
  label: string;
  icon: any;
  color: string;
  intro: string;
  faqs: { q: string; a: string }[];
};

const CATEGORIES: Record<string, Cat> = {
  paiement: {
    slug: "paiement",
    label: "Paiement",
    icon: CreditCard,
    color: "from-primary/30 to-primary/5",
    intro:
      "Tout ce qu'il faut savoir sur les paiements MboaEats : Mobile Money (MTN MoMo, Orange Money), cartes, cash à la livraison et remboursements.",
    faqs: [
      {
        q: "Quels moyens de paiement sont acceptés ?",
        a: "MTN Mobile Money, Orange Money, cartes Visa/Mastercard via notre prestataire, et cash à la livraison dans toutes les villes desservies.",
      },
      {
        q: "Comment payer avec MTN MoMo ou Orange Money ?",
        a: "Choisissez votre opérateur au paiement, saisissez votre numéro +237 et validez la pop-up USSD reçue. La confirmation est automatique via webhook sécurisé Campay — vous n'entrez jamais votre code PIN sur MboaEats.",
      },
      {
        q: "Mon paiement Mobile Money a échoué, que faire ?",
        a: "Vérifiez votre solde, l'état de votre compte et la couverture réseau. Vous pouvez réessayer immédiatement ou choisir Cash à la livraison. Tout débit non confirmé est automatiquement remboursé sous 24h.",
      },
      {
        q: "Délais de remboursement ?",
        a: "Mobile Money : 24h ouvrées. Carte bancaire : 3 à 7 jours selon la banque. Vous recevez un email + notification dès que le remboursement est lancé.",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Oui — toutes les transactions passent par des prestataires PCI-DSS et nous ne stockons aucune donnée bancaire sur nos serveurs.",
      },
      {
        q: "Puis-je avoir une facture ?",
        a: "Chaque commande génère un reçu téléchargeable depuis l'historique. Pour une facture entreprise, écrivez à " + SUPPORT_EMAIL + ".",
      },
    ],
  },
  livraison: {
    slug: "livraison",
    label: "Livraison",
    icon: Bike,
    color: "from-gold/30 to-gold/5",
    intro:
      "Délais, zones, suivi temps réel et frais de livraison MboaEats. Notre flotte couvre Douala, Yaoundé et Bafoussam.",
    faqs: [
      {
        q: "Quel est le délai moyen de livraison ?",
        a: "25 minutes en moyenne. L'ETA exact s'affiche en temps réel sur la page Suivi dès la confirmation de la commande.",
      },
      {
        q: "Quelles villes sont couvertes ?",
        a: "Douala, Yaoundé et Bafoussam, avec extension progressive aux quartiers périphériques. Saisissez votre adresse pour vérifier la disponibilité.",
      },
      {
        q: "Comment suivre ma commande en temps réel ?",
        a: "Depuis l'onglet Suivi : position du livreur sur la carte, étapes (préparation, prête, en route, livrée) et ETA mis à jour à la seconde.",
      },
      {
        q: "Les frais de livraison sont-ils fixes ?",
        a: "Non — ils dépendent de la zone et de la distance. Le montant exact est calculé et affiché avant validation du panier. Les abonnés MboaPass bénéficient de la livraison offerte.",
      },
      {
        q: "Que faire si le livreur ne trouve pas mon adresse ?",
        a: "Le livreur vous appellera. Pour éviter cela, ajoutez un point de repère dans le champ « Notes » de votre adresse.",
      },
      {
        q: "Puis-je laisser un pourboire ?",
        a: "Oui, en cash directement au livreur. Une option in-app arrive prochainement.",
      },
    ],
  },
  commande: {
    slug: "commande",
    label: "Commande",
    icon: Utensils,
    color: "from-emerald-500/30 to-emerald-500/5",
    intro:
      "Passer, modifier, annuler une commande, gérer les options et signaler un problème.",
    faqs: [
      {
        q: "Comment passer une commande ?",
        a: "Choisissez un restaurant, ajoutez vos plats au panier, vérifiez l'adresse de livraison et payez. Vous recevez une confirmation immédiate par notification + email.",
      },
      {
        q: "Comment annuler ma commande ?",
        a: "Annulation gratuite tant que le restaurant n'a pas démarré la préparation. Au-delà, contactez le support WhatsApp pour étudier un remboursement partiel.",
      },
      {
        q: "Puis-je modifier ma commande après validation ?",
        a: "Vous pouvez ajouter un plat dans les 2 minutes via le restaurant. Pour des modifications plus importantes, contactez immédiatement le support.",
      },
      {
        q: "Mon plat est arrivé froid ou incorrect, que faire ?",
        a: "Ouvrez un litige depuis l'historique de commande avec photo si possible. Notre équipe rembourse en moyenne sous 2h ouvrables.",
      },
      {
        q: "Puis-je commander pour quelqu'un d'autre ?",
        a: "Oui, indiquez son nom et son numéro dans l'adresse de livraison. Le livreur le contactera directement.",
      },
      {
        q: "Y a-t-il un montant minimum de commande ?",
        a: "Cela dépend du restaurant — le minimum est affiché sur sa fiche. La plupart démarrent à 2 000 FCFA.",
      },
    ],
  },
  "compte-securite": {
    slug: "compte-securite",
    label: "Compte & sécurité",
    icon: ShieldCheck,
    color: "from-blue-500/30 to-blue-500/5",
    intro:
      "Gestion de votre compte, mot de passe, données personnelles et confidentialité.",
    faqs: [
      {
        q: "Comment créer un compte MboaEats ?",
        a: "Cliquez sur Connexion, saisissez votre numéro de téléphone ou email, recevez un code à 6 chiffres et validez. Aucun mot de passe à retenir.",
      },
      {
        q: "J'ai perdu l'accès à mon numéro, que faire ?",
        a: "Écrivez à " + SUPPORT_EMAIL + " avec une preuve d'identité. Nous transférons votre compte sous 48h ouvrables.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Profil → Paramètres → Supprimer mon compte. La suppression est définitive après 14 jours, conformément au RGPD.",
      },
      {
        q: "Mes données sont-elles vendues à des tiers ?",
        a: "Jamais. Vos données sont utilisées uniquement pour exécuter votre commande et améliorer le service. Voir notre politique de confidentialité.",
      },
      {
        q: "Comment activer la double authentification ?",
        a: "La connexion par OTP (code à usage unique) est déjà une forme de 2FA. Aucune action supplémentaire requise.",
      },
      {
        q: "Mon compte a été suspendu, pourquoi ?",
        a: "Cela peut arriver en cas de fraude, abus de remboursement ou impayés répétés. Contactez le support pour contestation.",
      },
    ],
  },
};

export const Route = createFileRoute("/aide/$category")({
  loader: ({ params }) => {
    const cat = CATEGORIES[params.category];
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.cat.label ?? "Aide"} · Centre d'aide MboaEats` },
      { name: "description", content: loaderData?.cat.intro ?? "Centre d'aide MboaEats" },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-2xl font-bold">Catégorie introuvable</h1>
      <Link to="/aide" hash="categories" className="mt-4 inline-block text-primary hover:underline">← Retour aux catégories</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="text-destructive">{error.message}</p>
      <Link to="/aide" hash="categories" className="mt-4 inline-block text-primary hover:underline">← Retour aux catégories</Link>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = Route.useLoaderData() as { cat: Cat };
  const [open, setOpen] = useState<number | null>(0);
  const Icon = cat.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/aide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Centre d'aide
          </Link>
          <span className="font-display font-bold">{cat.label}</span>
          <div className="w-20" />
        </div>
      </header>

      <section className={`bg-gradient-to-br ${cat.color} noise`}>
        <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/60 backdrop-blur">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-extrabold md:text-4xl">{cat.label}</h1>
          </div>
          <p className="mt-3 max-w-2xl text-muted-foreground">{cat.intro}</p>
        </div>
      </section>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <section>
          <h2 className="font-display text-xl font-bold">Questions fréquentes — {cat.label}</h2>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface/60">
            {cat.faqs.map((f, i) => {
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
                    <div className="px-5 pb-5 text-sm text-muted-foreground animate-fade-up whitespace-pre-line">{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Bonjour MboaEats, j'ai une question sur ${cat.label}.`)}`}
            target="_blank" rel="noreferrer"
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 hover:border-emerald-400"
          >
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <p className="mt-2 font-semibold">WhatsApp</p>
            <p className="text-xs text-muted-foreground">Réponse en 5 min</p>
          </a>
          <a href={`tel:${SUPPORT_PHONE_INTL}`} className="rounded-2xl border border-border bg-surface/60 p-4 hover:border-primary">
            <Phone className="h-5 w-5 text-primary" />
            <p className="mt-2 font-semibold">{SUPPORT_PHONE}</p>
            <p className="text-xs text-muted-foreground">Appel direct</p>
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="rounded-2xl border border-gold/40 bg-gold/5 p-4 hover:border-gold">
            <Mail className="h-5 w-5 text-gold" />
            <p className="mt-2 break-all text-sm font-semibold">{SUPPORT_EMAIL}</p>
            <p className="text-xs text-muted-foreground">Email support</p>
          </a>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground">Autres catégories</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.values(CATEGORIES)
              .filter((c) => c.slug !== cat.slug)
              .map((c) => (
                <Link
                  key={c.slug}
                  to="/aide/$category"
                  params={{ category: c.slug }}
                  className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium hover:border-primary"
                >
                  {c.label}
                </Link>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
