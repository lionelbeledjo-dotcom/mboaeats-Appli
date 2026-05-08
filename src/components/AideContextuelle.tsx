import { useMemo, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { HelpCircle, MessageCircle, Mail, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FaqItem = { q: string; a: string };
type HelpSection = {
  key: string;
  title: string;
  intro?: string;
  faqs: FaqItem[];
};

const SUPPORT_PHONE = "237699999999"; // wa.me format
const SUPPORT_EMAIL = "support@mboaeat.site";

const SECTIONS: Record<string, HelpSection> = {
  home: {
    key: "home",
    title: "Accueil",
    intro: "Découvrez les restaurants, plats populaires et offres du moment.",
    faqs: [
      {
        q: "Comment chercher un restaurant ou un plat ?",
        a: "Utilisez la barre de recherche en haut, ou parcourez les catégories (Burgers, Poulet, Local…). Vous pouvez aussi filtrer par ville (Douala, Yaoundé, Bafoussam).",
      },
      {
        q: "Pourquoi je ne vois aucun restaurant ?",
        a: "Vérifiez que votre adresse de livraison est bien définie en haut de page. Si vous êtes en dehors de nos zones couvertes, ajoutez-vous à la liste d'attente via le bouton « Bientôt chez vous ».",
      },
      {
        q: "Comment ça marche en 3 étapes ?",
        a: "1) Choisissez vos plats. 2) Validez votre adresse et payez par Mobile Money, carte ou à la livraison. 3) Suivez votre commande en temps réel sur la carte.",
      },
    ],
  },
  connexion: {
    key: "connexion",
    title: "Connexion / Inscription",
    intro: "Problème de code ou d'envoi ? Voici les solutions immédiates.",
    faqs: [
      {
        q: "Je ne reçois pas le code SMS",
        a: "Vérifiez le format de votre numéro (+237…), votre signal réseau, et le dossier des messages bloqués. Sinon, basculez sur Email — c'est instantané.",
      },
      {
        q: "Je ne reçois pas le code WhatsApp",
        a: "WhatsApp peut être temporairement indisponible. Utilisez l'onglet Email ou contactez le support sur WhatsApp pour une inscription manuelle.",
      },
      {
        q: "Quelle méthode est la plus fiable ?",
        a: "L'email est actuellement la méthode la plus fiable : code reçu en quelques secondes, valable 10 minutes.",
      },
      {
        q: "J'ai changé de numéro",
        a: "Connectez-vous avec votre email habituel, puis modifiez votre numéro depuis Profil → Préférences.",
      },
    ],
  },
  recherche: {
    key: "recherche",
    title: "Recherche",
    faqs: [
      {
        q: "La recherche ne trouve pas ce que je cherche",
        a: "Essayez avec un mot plus court (ex: « ndolè » au lieu de « ndolè aux crevettes »). Vérifiez l'orthographe et la ville sélectionnée.",
      },
      {
        q: "Comment filtrer par catégorie ?",
        a: "Utilisez les chips de catégories sous la barre de recherche, ou ouvrez la page Découvrir.",
      },
    ],
  },
  decouvrir: {
    key: "decouvrir",
    title: "Découvrir",
    faqs: [
      {
        q: "À quoi servent les catégories ?",
        a: "Elles regroupent les restaurants et plats par type de cuisine pour vous aider à choisir plus vite.",
      },
      {
        q: "Comment voir les nouveautés ?",
        a: "Les nouveaux restaurants apparaissent dans la section « Récemment ajoutés » en haut de la page Découvrir.",
      },
    ],
  },
  restaurants: {
    key: "restaurants",
    title: "Restaurant",
    faqs: [
      {
        q: "Le restaurant est marqué « Fermé »",
        a: "Vous ne pouvez pas commander quand un restaurant est fermé. Ajoutez-le en favoris pour être prévenu à sa réouverture.",
      },
      {
        q: "Comment voir les avis ?",
        a: "Faites défiler vers le bas de la fiche restaurant : la note moyenne et les avis clients y sont affichés.",
      },
      {
        q: "Y a-t-il un montant minimum ?",
        a: "Oui, chaque restaurant définit son minimum de commande. Il est affiché en haut de la fiche.",
      },
    ],
  },
  checkout: {
    key: "checkout",
    title: "Commande / Paiement",
    intro: "Tout ce qu'il faut savoir avant de valider votre commande.",
    faqs: [
      {
        q: "Quels modes de paiement ?",
        a: "Mobile Money (MTN, Orange), carte bancaire, et paiement à la livraison (en espèces).",
      },
      {
        q: "Mon paiement Mobile Money a échoué",
        a: "Vérifiez votre solde et que le numéro saisi est bien celui de votre compte MoMo. Réessayez après 1 minute. Si le problème persiste, contactez le support.",
      },
      {
        q: "Puis-je modifier ma commande après paiement ?",
        a: "Oui dans les 2 premières minutes. Au-delà, contactez directement le restaurant via le bouton « Appeler » sur la page de suivi.",
      },
      {
        q: "Comment utiliser un code promo ?",
        a: "Saisissez votre code dans le champ « Code promo » juste avant de payer. La réduction s'applique automatiquement.",
      },
    ],
  },
  suivi: {
    key: "suivi",
    title: "Suivi de commande",
    faqs: [
      {
        q: "Mon livreur n'avance pas sur la carte",
        a: "La position se met à jour toutes les 30 secondes. Si le livreur reste bloqué plus de 5 minutes, appelez-le directement depuis la page de suivi.",
      },
      {
        q: "Combien de temps avant la livraison ?",
        a: "Le temps estimé est affiché en haut. Il dépend du restaurant, du trafic et de votre distance.",
      },
      {
        q: "Je veux annuler ma commande",
        a: "Possible uniquement avant que le restaurant ne commence la préparation. Cliquez sur « Annuler » en haut de la page de suivi.",
      },
    ],
  },
  commandes: {
    key: "commandes",
    title: "Mes commandes",
    faqs: [
      {
        q: "Comment recommander rapidement ?",
        a: "Cliquez sur « Recommander » à côté d'une commande passée — votre panier sera rempli automatiquement.",
      },
      {
        q: "Comment laisser un avis ?",
        a: "Une fois la commande livrée, ouvrez-la et notez le restaurant + le livreur de 1 à 5 étoiles.",
      },
      {
        q: "Où est ma facture ?",
        a: "Ouvrez la commande puis cliquez sur « Télécharger la facture » en bas.",
      },
    ],
  },
  favoris: {
    key: "favoris",
    title: "Favoris",
    faqs: [
      {
        q: "Comment ajouter un favori ?",
        a: "Cliquez sur le cœur ❤ en haut à droite d'un restaurant ou d'un plat.",
      },
      {
        q: "Mes favoris ont disparu",
        a: "Reconnectez-vous avec le même compte (email ou téléphone). Les favoris sont liés à votre compte.",
      },
    ],
  },
  profil: {
    key: "profil",
    title: "Profil",
    faqs: [
      {
        q: "Comment changer mon mot de passe ?",
        a: "MboaTV utilise un code à usage unique (OTP) — pas de mot de passe à mémoriser. À chaque connexion, vous recevez un nouveau code.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Profil → Préférences → « Supprimer mon compte ». La suppression est définitive sous 7 jours.",
      },
      {
        q: "Mes données sont-elles sécurisées ?",
        a: "Oui, vos données sont chiffrées et hébergées de manière sécurisée. Voir notre page Confidentialité.",
      },
    ],
  },
  adresses: {
    key: "adresses",
    title: "Adresses",
    faqs: [
      {
        q: "Comment ajouter une adresse précise ?",
        a: "Tapez votre quartier puis ajustez le pin sur la carte. Ajoutez un repère (« en face de la pharmacie X ») pour aider le livreur.",
      },
      {
        q: "Mon quartier n'est pas dans la liste",
        a: "Tapez le nom manuellement et placez le pin sur la carte. Si vous êtes hors zone, vous serez prévenu.",
      },
    ],
  },
  fidelite: {
    key: "fidelite",
    title: "Fidélité",
    faqs: [
      {
        q: "Comment gagner des points ?",
        a: "Vous gagnez 1 point par 100 FCFA dépensés. Les points sont crédités à la livraison.",
      },
      {
        q: "Comment utiliser mes points ?",
        a: "Au paiement, choisissez « Utiliser mes points » : 100 points = 500 FCFA de réduction.",
      },
    ],
  },
  parrainage: {
    key: "parrainage",
    title: "Parrainage",
    faqs: [
      {
        q: "Combien je gagne par filleul ?",
        a: "Vous recevez 2 000 FCFA dès que votre filleul passe sa 1ère commande. Lui reçoit 1 000 FCFA de bienvenue.",
      },
      {
        q: "Comment partager mon code ?",
        a: "Utilisez les boutons WhatsApp / SMS / Lien depuis la page Parrainage.",
      },
    ],
  },
  mboapass: {
    key: "mboapass",
    title: "MboaPass",
    faqs: [
      {
        q: "Qu'est-ce que MboaPass ?",
        a: "Un abonnement mensuel qui offre la livraison gratuite illimitée et des réductions exclusives.",
      },
      {
        q: "Puis-je annuler à tout moment ?",
        a: "Oui, sans frais. L'abonnement reste actif jusqu'à la fin de la période payée.",
      },
    ],
  },
  tablee: {
    key: "tablee",
    title: "Mode Tablée",
    faqs: [
      {
        q: "C'est quoi la Tablée ?",
        a: "Une commande partagée à plusieurs : chacun ajoute ses plats depuis son téléphone, vous payez ensemble ou séparément.",
      },
      {
        q: "Comment inviter des amis ?",
        a: "Créez la Tablée puis partagez le lien d'invitation par WhatsApp.",
      },
    ],
  },
  livreur: {
    key: "livreur",
    title: "Espace Livreur",
    faqs: [
      {
        q: "Comment je suis payé ?",
        a: "Vos gains sont crédités sur votre compte Mobile Money chaque semaine (lundi).",
      },
      {
        q: "Je n'arrive pas à activer mon statut « En ligne »",
        a: "Vérifiez que la géolocalisation est activée dans votre navigateur et que votre profil est validé par l'admin.",
      },
    ],
  },
  "mboa-ai": {
    key: "mboa-ai",
    title: "Mboa AI",
    faqs: [
      {
        q: "Que peut faire Mboa AI ?",
        a: "Vous suggérer des plats selon votre humeur, votre budget ou vos préférences alimentaires. Vous pouvez aussi lui demander « Que manger ce soir ? ».",
      },
      {
        q: "Mes conversations sont-elles privées ?",
        a: "Oui, elles sont uniquement utilisées pour améliorer vos suggestions. Voir Confidentialité.",
      },
    ],
  },
  admin: {
    key: "admin",
    title: "Espace Admin",
    faqs: [
      {
        q: "Comment ajouter un restaurant ?",
        a: "Admin → Restaurants → bouton « Ajouter ». Renseignez les infos, validez, le restaurant apparaît dans l'app.",
      },
      {
        q: "Comment gérer un litige ?",
        a: "Admin → Litiges. Cliquez sur le ticket, lisez l'historique, contactez les parties et clôturez avec une décision.",
      },
    ],
  },
  default: {
    key: "default",
    title: "Aide",
    intro: "Vous trouverez ici des réponses aux questions les plus fréquentes.",
    faqs: [
      {
        q: "Comment passer une commande ?",
        a: "Choisissez un restaurant, ajoutez des plats au panier, validez votre adresse et payez. C'est tout !",
      },
      {
        q: "Comment contacter le support ?",
        a: "Utilisez les boutons en bas de ce panneau : WhatsApp pour une réponse rapide, ou email pour un dossier détaillé.",
      },
    ],
  },
};

function getSectionForPath(path: string): HelpSection {
  if (path === "/" || path === "") return SECTIONS.home;
  if (path.startsWith("/connexion")) return SECTIONS.connexion;
  if (path.startsWith("/recherche")) return SECTIONS.recherche;
  if (path.startsWith("/decouvrir")) return SECTIONS.decouvrir;
  if (path.startsWith("/restaurant") || path.startsWith("/r/")) return SECTIONS.restaurants;
  if (path.startsWith("/checkout")) return SECTIONS.checkout;
  if (path.startsWith("/suivi")) return SECTIONS.suivi;
  if (path.startsWith("/commandes")) return SECTIONS.commandes;
  if (path.startsWith("/favoris")) return SECTIONS.favoris;
  if (path.startsWith("/profil") || path.startsWith("/preferences")) return SECTIONS.profil;
  if (path.startsWith("/adresses")) return SECTIONS.adresses;
  if (path.startsWith("/fidelite")) return SECTIONS.fidelite;
  if (path.startsWith("/parrainage")) return SECTIONS.parrainage;
  if (path.startsWith("/mboapass")) return SECTIONS.mboapass;
  if (path.startsWith("/tablee")) return SECTIONS.tablee;
  if (path.startsWith("/livreur") || path.startsWith("/devenir-livreur")) return SECTIONS.livreur;
  if (path.startsWith("/mboa-ai")) return SECTIONS["mboa-ai"];
  if (path.startsWith("/admin") || path.startsWith("/superadmin")) return SECTIONS.admin;
  return SECTIONS.default;
}

interface AideContextuelleProps {
  /** Override the auto-detected section */
  sectionKey?: keyof typeof SECTIONS;
  /** Custom trigger — if not provided, renders a floating "?" button */
  children?: React.ReactNode;
  /** Position for the default floating trigger */
  floating?: boolean;
  className?: string;
}

export function AideContextuelle({
  sectionKey,
  children,
  floating = false,
  className,
}: AideContextuelleProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const section = useMemo(
    () => (sectionKey ? SECTIONS[sectionKey] : getSectionForPath(location.pathname)),
    [sectionKey, location.pathname]
  );

  const waMessage = encodeURIComponent(
    `Bonjour MboaTV, j'ai besoin d'aide sur la section « ${section.title} ».`
  );
  const waLink = `https://wa.me/${SUPPORT_PHONE}?text=${waMessage}`;
  const mailLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Aide — ${section.title}`
  )}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <button
            type="button"
            aria-label="Besoin d'aide ?"
            className={cn(
              floating
                ? "fixed bottom-24 right-3 z-40 sm:right-4"
                : "inline-flex",
              "h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95",
              className
            )}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full max-w-md overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <HelpCircle className="h-5 w-5 text-orange-500" />
            Besoin d'aide sur {section.title} ?
          </SheetTitle>
          {section.intro && (
            <SheetDescription className="text-left">
              {section.intro}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {section.faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Toujours besoin d'aide ?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full justify-between bg-[#25D366] text-white hover:bg-[#25D366]/90"
              >
                <a href={waLink} target="_blank" rel="noreferrer">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Contacter sur WhatsApp
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <a href={mailLink}>
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Envoyer un email
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Réponse moyenne : moins de 30 minutes (9h–22h)
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AideContextuelle;
