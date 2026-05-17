## Dashboard Restaurant Web (partenaire)

### Périmètre
Créer une **interface web dédiée** aux restaurateurs, complètement isolée de l'app client (mobile-first). L'app client (`/`, `/explorer`, `/panier`, etc.) n'est **pas touchée**. Le `/restaurant` actuel (UI tabbed mobile) reste en place pour compatibilité, mais la nouvelle expérience web vit sous `/partenaire/*`.

> Note : `restaurant.mboaeats.com` est un sous-domaine — il faut le pointer DNS vers le même projet et router selon l'hôte, OU exposer le dashboard à `/partenaire`. Je propose **`/partenaire`** comme base (simple, immédiat). Le sous-domaine pourra rediriger via Cloudflare Worker ou middleware plus tard si tu veux.

### Architecture

```
src/routes/
  partenaire.tsx                  → Layout sidebar + garde rôle/statut
  partenaire.index.tsx            → Redirige vers /partenaire/commandes
  partenaire.commandes.tsx        → Temps réel + actions (accepter, refuser, en prépa, prête)
  partenaire.menu.tsx             → CRUD plats + activer/désactiver
  partenaire.revenus.tsx          → Total commandes, commissions, net
  partenaire.parametres.tsx       → Infos resto, horaires, ouvert/fermé

src/components/partenaire/
  PartenaireSidebar.tsx           → Nav latérale (logo, items, sélecteur resto, déconnexion)
  PendingApprovalScreen.tsx       → Écran "en attente de validation"
  RestaurantSwitcher.tsx          → Si le user gère plusieurs restos
```

### Sécurité (garde unique)
Le layout `partenaire.tsx` :
1. `beforeLoad` : vérifie session via `supabase.auth.getUser()` → sinon redirige `/connexion?redirect=/partenaire`
2. Appelle `listMyRestaurants()` (déjà existant) :
   - **Aucun resto** → écran "Devenir restaurateur" (lien `/devenir-resto`)
   - **Resto(s) trouvé(s)** mais `is_active=false` + pas `deleted_at` → écran *"Compte en attente de validation"* (texte demandé)
   - **Resto validé** (`is_active=true`) → accès dashboard
3. Stocke le `restaurant_id` actif dans `localStorage` (`mboa.partenaire.activeResto`) ; sélecteur dans la sidebar si plusieurs.

Toutes les server functions appelées (`listRestaurantOrders`, `updateOrderStatus`, `getRestaurantMenu`, `upsertDish`, `deleteDish`, `getRestaurantStats`, etc.) **existent déjà** dans `src/server/restaurant.functions.ts` et passent par `assertMembership(restaurant_id, minRole)` — la sécurité multi-tenant est donc garantie côté serveur, RLS en backstop.

### UI (sidebar fixe + main scrollable)

```
┌──────────────┬──────────────────────────────────────┐
│  MboaEats    │  En-tête : nom resto + toggle Ouvert │
│  Partenaire  ├──────────────────────────────────────┤
│              │                                       │
│  ▸ Commandes │            <Outlet />                 │
│  ▸ Menu      │                                       │
│  ▸ Revenus   │                                       │
│  ▸ Paramètres│                                       │
│              │                                       │
│  [Resto ▾]   │                                       │
│  Déconnexion │                                       │
└──────────────┴──────────────────────────────────────┘
```

- Sidebar fixe `w-64` desktop, drawer mobile (`<768px`) avec bouton hamburger.
- Cohérent avec le design system existant (`bg-background`, `border-border`, tokens `--primary` etc.).
- Responsive : sur mobile/tablette < 768px, sidebar devient un drawer (`Sheet`).

### Fonctionnalités par page

**Commandes** (`partenaire.commandes.tsx`)
- Realtime Supabase sur `orders` filtré `restaurant_id`.
- 3 colonnes Kanban : *Nouvelles* (`paid`) · *En préparation* (`accepted`/`preparing`) · *Prêtes* (`ready`).
- Boutons : Accepter, Refuser, En préparation, Prête → `updateOrderStatus()`.
- Toast + son optionnel sur nouvelle commande.

**Menu** (`partenaire.menu.tsx`)
- Liste catégories + plats. Boutons : ajouter, modifier, supprimer, switch `is_available`.
- Upload image via `uploadDishImage` existant.

**Revenus** (`partenaire.revenus.tsx`)
- `getRestaurantStats()` → cartes : total commandes (7j/30j), commissions, net.
- Filtres période (7j / 30j / mois).

**Paramètres** (`partenaire.parametres.tsx`)
- Édite : nom, cuisine, ville, quartier, `delivery_fee`, `eta_min/max`, horaires.
- Toggle global Ouvert/Fermé.

### Non-objectifs (cette itération)
- Pas de configuration DNS du sous-domaine `restaurant.mboaeats.com` (à faire séparément dans Project Settings → Domains une fois la base validée).
- Pas de modif de `/restaurant` existant ni de l'app client.
- Pas de nouvelle table — tout le backend nécessaire existe.

### Livraison
~9 fichiers créés, ~0 fichier modifié côté client app. Build incrémental, testable page par page.
