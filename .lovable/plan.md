# Refonte complète MboaEats — Style "Terroir"

## 1. Identité visuelle (src/styles.css)
Remplacer la palette actuelle (vert Mboa #06C167, fonds sombres) par :
- `--background` : #F5F0E8 (beige crème)
- `--foreground` : #1A1A1A
- `--muted-foreground` : #6B6B6B
- `--primary` : #2D5A27 (vert forêt) / `--primary-foreground` : #FFFFFF
- `--accent` : #4A7C3F (vert clair hover)
- `--card` : #FFFFFF
- `--rating` : #F4A623 (étoiles)
- Police : importer Inter via `@import` Google Fonts, l'appliquer en `--font-sans` ; tailles H1 24/700, H2 20/600, body 13/300, prix 16/700, navbar 11/500
- Garder les anciennes variables `--brand-cm-green` mais les pointer vers le nouveau vert pour ne rien casser

## 2. Logo (src/components/brand/MboaEatsLogo.tsx)
- Drapeau Cameroun SVG : 3 bandes verticales vert (#007A5E) / rouge (#CE1126) / jaune (#FCD116) avec étoile jaune centrée sur la bande rouge
- Texte « Mboa » (#2D5A27) + « Eats » (#4A7C3F), police Inter bold
- Version compacte pour topbar

## 3. Navbar (src/components/BottomDock.tsx)
- 4 onglets seulement : Accueil / Commandes / Panier / Profil (suppression Découvrir)
- Fond blanc #FFFFFF, hauteur 64px, ombre `0 -2px 12px rgba(0,0,0,0.08)`
- Actif : icône + label #2D5A27 (label visible) ; inactif : #9CA3AF
- Badge panier : pastille verte #2D5A27
- Aucune transition de page (déjà fait, vérifier 0ms)

## 4. Topbar (nouveau composant `src/components/AppTopBar.tsx`)
- Fond blanc + ombre légère
- Logo + drapeau à gauche, hamburger ☰ à droite
- Réutilisé sur Accueil, Commandes, Panier, Profil

## 5. Données restaurants (src/data/restaurants.ts)
Remplacement complet par les 6 entrées du brief, ville Douala, devise FCFA, photos depuis Unsplash (WebP, lazy loading) :
1. Le Goût du Terroir — 4.7 / 30-40 min / 2 500 F
2. Chez Pauline — 4.6 / 25-35 min / 2 000 F
3. Jollof (Riz) — 4.5 / 25-35 min / 2 000 F
4. Poulet DG — 4.8 / 20-30 min / 2 500 F
5. La Case Bamiléké — 4.8 / 30-45 min / 2 500 F
6. Saveurs du Soleil — 4.3 / 30-40 min / 2 000 F

## 6. Page Accueil (src/routes/index.tsx)
- Titre H1 « Bienvenue sur MboaEats » vert foncé
- Barre de recherche blanche, bordure #E5E5E5, radius 12px, placeholder « Rechercher un plat ou un restaurant »
- Section « Restaurants populaires » : carte horizontale (image 80×80, nom 15/700, description 12 fine grise, ⭐ note + ⏱ délai, prix « À partir de X FCFA » + bouton « + Ajouter » vert)
- Bouton « + Ajouter » : ajoute au panier via store + incrémente badge navbar

## 7. Page Panier (src/routes/checkout.tsx)
Refonte avec : titre « Mon panier », photo ronde + nom + stepper [−][+] + prix + ✕, résumé sous-total / livraison 500 F / total bold, bouton pleine largeur vert « PASSER LA COMMANDE »

## 8. Page Suivi (src/routes/suivi.$orderId.tsx)
- Titre « Suivi de commande — Commande #ID »
- Statut « En cours — Estimation : 30-40 min »
- Frise horizontale 4 étapes (Reçue → En préparation → En route → Livrée) avec ronds connectés
- Carte (placeholder ou Maps existante)
- Détails adresse / paiement / total
- Bouton outline vert « BESOIN D'AIDE ? »

## 9. État global Zustand
- `bun add zustand`
- Créer `src/stores/`:
  - `cart-store.ts` (persisté localStorage) — remplace `use-cart.ts` (garder export `useCart` avec même API pour ne rien casser)
  - `user-store.ts` (persisté)
  - `restaurants-store.ts` (chargé une fois)
  - `orders-store.ts`
- Migrer les imports existants ; conserver la signature `{ items, count, subtotal, add, remove, … }` pour éviter de casser les pages non-touchées

## 10. Performance
- `defaultPreload: "intent"` déjà actif dans router → vérifier
- `preload="intent"` sur tous les `<Link>` navbar (déjà fait)
- Suppression animations route (déjà fait via styles.css)
- Lazy loading natif `loading="lazy"` + `width/height` fixes sur toutes les `<img>` (CLS=0)

## Détails techniques
- Tokens Tailwind : exposer `bg-terroir-cream`, `text-forest`, `bg-forest`, `text-forest-light` via `@theme` dans styles.css
- Composants UI shadcn (button, card) : ajouter variante `terroir` si nécessaire ; sinon utiliser classes utilitaires
- Pages secondaires non listées (recherche, profil, fidélité, etc.) : héritent automatiquement des nouveaux tokens — un pass visuel léger pour vérifier la lisibilité, mais pas de refonte
- Auth : aucun changement (connexion.tsx, inscription.tsx intacts)
- Drapeau Cameroun : SVG inline 24×16 dans le logo

## Ordre d'exécution
1. styles.css (palette + Inter) + dépendance Zustand
2. Logo + Topbar
3. Stores Zustand (cart en priorité, API compatible)
4. Données restaurants
5. Navbar 4 onglets
6. Accueil
7. Panier
8. Suivi
9. QA visuel rapide sur pages secondaires (lisibilité textes secondaires)
