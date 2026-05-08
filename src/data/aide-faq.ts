// FAQ contextuelle MboaTV — modifie ce fichier pour mettre à jour les aides.
// Chaque section a une `description` courte injectée dans le message WhatsApp.

export type FaqItem = { q: string; a: string };

export type HelpSection = {
  key: string;
  /** Titre court inséré après "Besoin d'aide sur ..." */
  title: string;
  /** Petite description envoyée au support WhatsApp */
  description: string;
  /** Phrase d'intro affichée sous le titre du panneau */
  intro?: string;
  faqs: FaqItem[];
};

export const SECTIONS: Record<string, HelpSection> = {
  home: {
    key: "home",
    title: "la page d'accueil",
    description: "navigation et découverte des restaurants",
    faqs: [
      {
        q: "Comment trouver un restaurant près de moi ?",
        a: "Cliquez sur la barre de recherche en haut de la page et tapez le nom d'un restaurant ou d'un plat. Vous pouvez aussi filtrer par catégorie (Repas, Boissons, Desserts) ou par note (4+ étoiles).",
      },
      {
        q: "Les restaurants affichés sont-ils fiables ?",
        a: "Tous les restaurants sur MboaTV sont vérifiés par notre équipe. Les notes (1-5 étoiles) sont laissées par de vrais clients.",
      },
      {
        q: "Comment contacter le support ?",
        a: "Cliquez sur le bouton « ? » sur n'importe quelle page. En bas du panneau, cliquez sur « Contacter sur WhatsApp » pour ouvrir directement notre WhatsApp : +33 6 66 52 41 01.",
      },
    ],
  },
  connexion: {
    key: "connexion",
    title: "la connexion",
    description: "réception du code SMS, WhatsApp ou Email",
    faqs: [
      {
        q: "Je ne reçois pas le code SMS, que faire ?",
        a: "Si vous ne recevez pas le SMS, cliquez sur le bouton « Recevoir par WhatsApp » ou essayez la connexion par Email. Si le problème persiste, contactez-nous sur WhatsApp : +33 6 66 52 41 01.",
      },
      {
        q: "Je ne reçois pas le lien email, que faire ?",
        a: "Vérifiez votre dossier SPAM/Pourriels. Le lien arrive parfois avec quelques secondes de retard. Si vous ne le recevez toujours pas, contactez-nous.",
      },
      {
        q: "J'ai oublié mon mot de passe",
        a: "MboaTV utilise un code à usage unique (OTP) — pas de mot de passe à mémoriser. Cliquez sur « Mot de passe oublié ? » ou demandez un nouveau code par email/SMS/WhatsApp. Le code est valable 30 minutes.",
      },
    ],
  },
  recherche: {
    key: "recherche",
    title: "la recherche",
    description: "recherche et filtres de restaurants",
    faqs: [
      {
        q: "Comment filtrer les restaurants ?",
        a: "En haut de la liste, utilisez les filtres :\n• Par catégorie (Ndolé, Soya, Poulet, Boissons…)\n• Par note (4+ étoiles, 3+ étoiles)\n• Par distance (les plus proches d'abord)\n• Par temps de livraison (moins de 30 min)\n• Par prix (€ €€ €€€)",
      },
      {
        q: "Un restaurant est marqué « Fermé », puis-je quand même commander ?",
        a: "Non, quand un restaurant est fermé vous ne pouvez pas passer de commande. Revenez plus tard — les heures d'ouverture sont affichées sur la fiche du restaurant.",
      },
      {
        q: "Comment voir les plats d'un restaurant ?",
        a: "Cliquez sur la carte du restaurant pour ouvrir sa fiche complète avec tous les plats, descriptions, photos et prix.",
      },
    ],
  },
  decouvrir: {
    key: "decouvrir",
    title: "la page Découvrir",
    description: "exploration des catégories et nouveautés",
    faqs: [
      {
        q: "À quoi servent les catégories ?",
        a: "Elles regroupent les restaurants et plats par type de cuisine pour vous aider à choisir plus vite.",
      },
      {
        q: "Comment voir les nouveautés ?",
        a: "Les nouveaux restaurants apparaissent dans la section « Récemment ajoutés » en haut de la page Découvrir.",
      },
      {
        q: "Comment filtrer les restaurants ?",
        a: "Utilisez les chips de catégories en haut de la page, ou la barre de recherche pour un mot-clé précis.",
      },
    ],
  },
  restaurants: {
    key: "restaurants",
    title: "ce restaurant",
    description: "menu, plats et personnalisation",
    faqs: [
      {
        q: "Comment ajouter un plat au panier ?",
        a: "Sélectionnez le plat qui vous intéresse, choisissez les options (taille, accompagnements) et le nombre d'articles, puis cliquez sur « Ajouter au panier ».",
      },
      {
        q: "Je ne trouve pas un plat que j'aime habituellement",
        a: "Utilisez le champ de recherche dans le menu du restaurant pour trouver un plat spécifique. Si le plat n'existe pas, contactez le restaurant directement — son numéro est affiché en bas de la fiche.",
      },
      {
        q: "Les photos correspondent-elles aux vrais plats ?",
        a: "Oui, toutes les photos sont fournies par les restaurants eux-mêmes. Si vous recevez quelque chose de très différent, ouvrez un litige depuis « Mes Commandes ».",
      },
      {
        q: "Comment personnaliser un plat (sans oignon, etc.) ?",
        a: "Certains plats proposent des « notes spéciales ». Cliquez sur le plat et cherchez le champ « Instructions spéciales » pour ajouter votre demande.",
      },
    ],
  },
  panier: {
    key: "panier",
    title: "votre panier",
    description: "gestion des articles avant validation",
    faqs: [
      {
        q: "Comment modifier les quantités dans le panier ?",
        a: "À côté de chaque article, utilisez les boutons [-] et [+] pour ajuster la quantité. Supprimez un article avec l'icône poubelle à droite.",
      },
      {
        q: "Mon panier est vide, pourquoi ?",
        a: "Le panier se vide automatiquement après 2 heures d'inactivité. Re-ajoutez les articles qui vous intéressent.",
      },
      {
        q: "Je veux commander dans 2 restaurants différents",
        a: "MboaTV ne permet qu'une commande par restaurant à la fois. Placez votre première commande, puis revenez pour le deuxième restaurant.",
      },
      {
        q: "Le total ne semble pas correct",
        a: "Le total inclut : prix des plats + frais de service MboaTV (2%) + frais de livraison (selon distance). Le détail est affiché au bas du panier avant validation.",
      },
    ],
  },
  checkout: {
    key: "checkout",
    title: "le paiement",
    description: "moyens de paiement et frais",
    faqs: [
      {
        q: "Quels moyens de paiement sont disponibles ?",
        a: "Nous acceptons :\n• Mobile Money (Orange Money, MTN Mobile Money)\n• Paiement à la livraison (espèces)\n• Carte bancaire (Visa / Mastercard)\nLe moyen disponible dépend du restaurant choisi.",
      },
      {
        q: "Mon paiement a échoué, que faire ?",
        a: "Vérifiez que :\n• Votre solde Mobile Money est suffisant\n• Votre carte est valide et non expirée\n• Votre connexion internet est stable\nSi le problème persiste, essayez « Paiement à la livraison ».",
      },
      {
        q: "Puis-je changer d'adresse de livraison après paiement ?",
        a: "Non, l'adresse est figée après validation. Contactez immédiatement le support WhatsApp si vous vous êtes trompé.",
      },
      {
        q: "Je vois des frais de service, c'est quoi ?",
        a: "Les frais de service (2% du total) couvrent les coûts de la plateforme MboaTV. Ils sont obligatoires et appliqués sur toutes les commandes.",
      },
    ],
  },
  commandes: {
    key: "commandes",
    title: "vos commandes",
    description: "historique, suivi et annulation",
    faqs: [
      {
        q: "Comment suivre ma commande en temps réel ?",
        a: "Cliquez sur la commande en cours pour voir son statut détaillé : Commandée → En préparation → En livraison → Livrée. Avec le nom et le numéro du livreur une fois assigné.",
      },
      {
        q: "Ma commande est « En préparation » depuis longtemps",
        a: "Le temps de préparation varie selon le restaurant et l'affluence. Si cela dépasse 45 minutes, contactez le restaurant via le bouton « Appeler le restaurant » ou ouvrez un litige.",
      },
      {
        q: "Comment annuler une commande ?",
        a: "Ouvrez la commande → cliquez sur « Annuler la commande ». L'annulation est gratuite avant que le restaurant n'ait confirmé. Après confirmation, des frais peuvent s'appliquer.",
      },
      {
        q: "Ma commande est arrivée mais incomplète",
        a: "Ouvrez un litige depuis cette commande. Sélectionnez « Plats manquants », ajoutez une photo si possible. Notre équipe traite les litiges en moins de 24h.",
      },
    ],
  },
  suivi: {
    key: "suivi",
    title: "le suivi de commande",
    description: "position du livreur et statut",
    faqs: [
      {
        q: "Comment suivre ma commande en temps réel ?",
        a: "Le statut s'actualise automatiquement : Commandée → En préparation → En livraison → Livrée. La position du livreur est mise à jour toutes les 30 secondes.",
      },
      {
        q: "Mon livreur n'avance pas sur la carte",
        a: "Si le livreur reste bloqué plus de 5 minutes, appelez-le directement depuis la page de suivi avec le bouton « Appeler le livreur ».",
      },
      {
        q: "Je veux annuler ma commande",
        a: "Possible uniquement avant que le restaurant n'ait commencé la préparation. Cliquez sur « Annuler » en haut de la page de suivi.",
      },
    ],
  },
  profil: {
    key: "profil",
    title: "votre compte",
    description: "modification du profil et sécurité",
    faqs: [
      {
        q: "Comment changer mon numéro de téléphone ?",
        a: "Allez dans Profil → Modifier → Téléphone. Entrez le nouveau numéro et confirmez-le avec le code reçu par SMS ou WhatsApp.",
      },
      {
        q: "Comment changer mon mot de passe ?",
        a: "Allez dans Profil → Sécurité → « Changer le mot de passe ». Entrez l'ancien puis le nouveau mot de passe.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Allez dans Profil → Paramètres → « Supprimer mon compte » en bas de page. Cette action est irréversible. Toutes vos données seront supprimées sous 30 jours.",
      },
      {
        q: "Comment mettre à jour mon adresse par défaut ?",
        a: "Allez dans Profil → Adresses → cliquez sur une adresse → bouton « Définir comme adresse par défaut ».",
      },
    ],
  },
  adresses: {
    key: "adresses",
    title: "vos adresses",
    description: "ajout et gestion des adresses de livraison",
    faqs: [
      {
        q: "Comment ajouter une adresse précise ?",
        a: "Tapez votre quartier puis ajustez le pin sur la carte. Ajoutez un repère (« en face de la pharmacie X ») pour aider le livreur.",
      },
      {
        q: "Comment mettre à jour mon adresse par défaut ?",
        a: "Cliquez sur une adresse de la liste → bouton « Définir comme adresse par défaut ».",
      },
      {
        q: "Mon quartier n'est pas dans la liste",
        a: "Tapez le nom manuellement et placez le pin sur la carte. Si vous êtes hors zone, vous serez prévenu.",
      },
    ],
  },
  litiges: {
    key: "litiges",
    title: "un litige",
    description: "ouverture d'un litige et remboursement",
    faqs: [
      {
        q: "Comment ouvrir un litige ?",
        a: "Allez dans Mes Commandes → sélectionnez la commande concernée → cliquez sur « Ouvrir un litige ». Choisissez le type : Plats manquants, Erreur de commande, Retard, Qualité, Livraison abîmée.",
      },
      {
        q: "Combien de temps pour traiter un litige ?",
        a: "Notre équipe traite les litiges en moins de 24h ouvrées. Vous recevrez une notification WhatsApp quand votre litige sera résolu.",
      },
      {
        q: "Puis-je obtenir un remboursement ?",
        a: "Oui, selon le type de litige et les preuves fournies, un remboursement partiel ou total peut être accordé. Le remboursement apparaît sous 3-5 jours ouvrés.",
      },
      {
        q: "Je ne suis pas d'accord avec la réponse au litige",
        a: "Répondez directement dans le litige pour demander une révision. Notre équipe support réexaminera le cas.",
      },
    ],
  },
  livreur: {
    key: "livreur",
    title: "votre activité de livreur",
    description: "courses, statut et gains",
    faqs: [
      {
        q: "Comment accepter une livraison ?",
        a: "Quand une commande est assignée, vous recevez une notification. Cliquez sur « Accepter » pour la prendre en charge ou « Refuser » si vous n'êtes pas disponible.",
      },
      {
        q: "Comment changer le statut d'une livraison ?",
        a: "Dans l'écran de la livraison active, cliquez sur : « Arrivé au restaurant » → « Commande récupérée » → « En route vers le client » → « Livré ».",
      },
      {
        q: "Un client ne répond pas au téléphone",
        a: "Essayez 3 fois à 5 minutes d'intervalle. Si toujours pas de réponse, cliquez sur « Signaler un problème » et contactez le support.",
      },
      {
        q: "Comment voir mes gains ?",
        a: "Allez dans Mon Profil → section « Gains » pour voir le total des courses livrées, les pourboires, et le solde disponible.",
      },
    ],
  },
  favoris: {
    key: "favoris",
    title: "vos favoris",
    description: "gestion des restaurants et plats favoris",
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
  fidelite: {
    key: "fidelite",
    title: "votre fidélité",
    description: "points de fidélité et réductions",
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
    title: "le parrainage",
    description: "invitation d'amis et bonus",
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
    description: "abonnement et avantages MboaPass",
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
    title: "le mode Tablée",
    description: "commande partagée à plusieurs",
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
  "mboa-ai": {
    key: "mboa-ai",
    title: "Mboa AI",
    description: "suggestions de plats par IA",
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
    title: "la console admin",
    description: "gestion restaurants, livreurs et litiges",
    faqs: [
      {
        q: "Comment approuver un nouveau restaurant ?",
        a: "Allez dans Restaurants → cliquez sur le restaurant « En attente » → vérifiez les documents KYC → cliquez sur « Approuver ». Le restaurant devient visible sur l'app.",
      },
      {
        q: "Comment suspendre un livreur ?",
        a: "Allez dans Livreurs → trouvez le livreur → cliquez sur « Suspendre ». Ajoutez une raison (optionnel). Le livreur sera notifié et ne pourra plus accepter de courses.",
      },
      {
        q: "Comment gérer un litige côté admin ?",
        a: "Allez dans Litiges → sélectionnez le litige → consultez les preuves → choisissez : Rembourser, Fermer sans remboursement, ou Répondre au client.",
      },
    ],
  },
  default: {
    key: "default",
    title: "MboaTV",
    description: "question générale",
    intro: "Vous trouverez ici des réponses aux questions les plus fréquentes.",
    faqs: [
      {
        q: "Comment passer une commande ?",
        a: "Choisissez un restaurant, ajoutez des plats au panier, validez votre adresse et payez. C'est tout !",
      },
      {
        q: "Comment contacter le support ?",
        a: "Utilisez les boutons en bas de ce panneau : WhatsApp pour une réponse rapide (+33 6 66 52 41 01), ou email pour un dossier détaillé.",
      },
    ],
  },
};

export function getSectionForPath(path: string): HelpSection {
  if (path === "/" || path === "") return SECTIONS.home;
  if (path.startsWith("/connexion")) return SECTIONS.connexion;
  if (path.startsWith("/recherche")) return SECTIONS.recherche;
  if (path.startsWith("/decouvrir") || path.startsWith("/categorie")) return SECTIONS.decouvrir;
  if (path.startsWith("/restaurant") || path.startsWith("/r/")) return SECTIONS.restaurants;
  if (path.startsWith("/checkout")) return SECTIONS.checkout;
  if (path.startsWith("/panier")) return SECTIONS.panier;
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
  if (path.includes("litige")) return SECTIONS.litiges;
  if (path.startsWith("/admin") || path.startsWith("/superadmin")) return SECTIONS.admin;
  return SECTIONS.default;
}

export const SUPPORT_PHONE = "33666524101";
export const SUPPORT_EMAIL = "support@mboaeat.site";
