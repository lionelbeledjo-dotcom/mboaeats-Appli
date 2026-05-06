import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield, Lock, Eye, FileText, Mail } from "lucide-react";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Confidentialité & RGPD — MboaEats" },
      { name: "description", content: "Politique de confidentialité MboaEats : protection de vos données personnelles, conformité RGPD et loi camerounaise." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const sections = [
    {
      icon: Shield,
      title: "1. Données collectées",
      content: "Nous collectons uniquement les données nécessaires à la livraison : nom, numéro de téléphone, adresse, historique de commandes, et données de paiement (chiffrées via MTN MoMo et Orange Money). Aucune donnée bancaire n'est stockée sur nos serveurs.",
    },
    {
      icon: Lock,
      title: "2. Sécurité",
      content: "Toutes les communications sont chiffrées (TLS 1.3). L'authentification utilise un OTP SMS à usage unique. Les mots de passe ne sont jamais stockés en clair. Hébergement conforme aux normes ISO 27001.",
    },
    {
      icon: Eye,
      title: "3. Utilisation des données",
      content: "Vos données servent exclusivement à : traiter les commandes, vous identifier, améliorer l'expérience (Mboa AI), et vous envoyer les notifications de suivi. Aucune revente à des tiers.",
    },
    {
      icon: FileText,
      title: "4. Vos droits (RGPD & Loi 2010/012 Cameroun)",
      content: "Vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition. Pour exercer ces droits, contactez-nous à lionelbrown2728@yahoo.fr — réponse sous 30 jours.",
    },
    {
      icon: Mail,
      title: "5. Cookies & traceurs",
      content: "Nous utilisons uniquement des cookies techniques (session, panier). Aucun traceur publicitaire tiers. Le cache local stocke vos plats favoris pour le mode hors-ligne partiel sur réseau 3G.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link to="/" className="rounded-full p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Confidentialité</h1>
            <p className="text-xs text-muted-foreground">Mise à jour : Mai 2026</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
          <Shield className="mb-3 h-10 w-10" />
          <h2 className="text-2xl font-bold">Vos données vous appartiennent</h2>
          <p className="mt-2 text-sm opacity-90">
            MboaEats respecte le RGPD européen et la loi camerounaise n°2010/012 sur la cybersécurité et la protection des données personnelles.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {sections.map((s) => (
            <article key={s.title} className="rounded-2xl border border-border/50 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold">{s.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.content}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border/50 bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">Une question sur vos données ?</p>
          <a
            href="mailto:lionelbrown2728@yahoo.fr"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            <Mail className="h-4 w-4" /> lionelbrown2728@yahoo.fr
          </a>
        </div>
      </main>
    </div>
  );
}
