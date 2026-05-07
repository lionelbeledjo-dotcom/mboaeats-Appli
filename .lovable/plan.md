## Objectif

Faire passer MboaEats d'un prototype à une marketplace de livraison de repas réellement fonctionnelle, persistante et multi-utilisateur — niveau Uber Eats / Deliveroo — sur Lovable Cloud, avec paiement Mobile Money (MTN/Orange) par OTP.

Pour ne rien bâcler, je découpe en **5 lots** livrés successivement. Chaque lot est testable en bout-à-bout avant de passer au suivant.

---

## Lot 1 — Fondations backend (Cloud)

Créer toute la structure de données réelle qui remplace les mocks actuels.

Tables ajoutées :

- `restaurants` (nom, slug, ville, quartier, cuisine, note, ETA min/max, frais base, image, statut ouvert/fermé, owner_id)
- `menu_categories` (resto_id, nom, ordre)
- `dishes` (resto_id, catégorie, nom, description, prix, image, allergènes, dispo)
- `dish_options` (dish_id, type single/multi, libellé) + `dish_option_values` (libellé, prix delta)
- `addresses` (user_id, label, ligne, ville, quartier, lat/lng, default)
- `orders` (user_id, resto_id, livreur_id, address_id, statut [draft/payée/acceptée/préparée/ramassée/livrée/annulée], sous-total, frais livraison, promo, total, ETA, timestamps par étape)
- `order_items` (order_id, dish_id, qty, prix unitaire, options JSON)
- `order_events` (order_id, type, payload JSON, created_at) — pour la timeline
- `promos` (code, type %/montant, min commande, expiration, usage max)
- `loyalty_points` (user_id, points, level)
- `restaurant_reviews` (order_id, user_id, resto_id, note, commentaire)
- `delivery_offers` (order_id, livreur_id, statut proposée/acceptée/refusée/expirée)

RLS strict sur chaque table : client voit ses commandes, resto voit les siennes, livreur voit ses missions, admin voit tout (via `has_role`).

Realtime activé sur : `orders`, `order_events`, `driver_locations`, `delivery_offers`.

Seed minimal : 6 restos, ~30 plats, 5 promos, 3 zones, pour pouvoir démontrer.

---

## Lot 2 — Espace Client (parcours commande complet)

Refonte des pages existantes pour brancher sur les vraies données :

- `/` — accueil avec restos populaires, catégories, restos près de chez vous (depuis la table)
- `/recherche` — recherche full-text + filtres (cuisine, note min, ETA max, prix, ouvert maintenant) + carte
- `/restaurants/$id` — fiche resto réelle (menu, options, panier sticky, badge "ouvert/fermé")
- `/checkout` — récap, sélection adresse, code promo (vérifié serveur), choix MoMo (MTN/Orange), création de la commande en `draft`
- `/tablee/paiement` (déjà existant) — étendu : crée le `payment` + `order` réels, OTP, à validation passe la commande en `payée`
- `/suivi/$orderId` — page de tracking live (statuts realtime + position livreur sur carte + ETA dynamique + chat avec livreur basique)
- `/commandes` — historique réel (filtré par utilisateur)
- `/profil`, `/adresses`, `/fidelite` — branchés sur les vraies tables

Nouveautés UX pro :
- Skeleton loaders partout
- Toasts d'état (commande acceptée, livreur en route, etc.)
- Notifications navigateur quand statut change (avec permission)
- Indicateur "ouvert/fermé" calculé sur horaires
- Estimation de livraison dynamique (ETA resto + ETA zone)

---

## Lot 3 — Espace Restaurant (back-office)

Routes sous `/restaurant` (déjà amorcé), protégées par rôle `restaurant`.

- `/restaurant` — dashboard : commandes du jour, CA, plats top
- `/restaurant/commandes` — file en temps réel (nouvelle / en préparation / prête / remise au livreur), boutons d'action qui poussent un `order_event`
- `/restaurant/menu` — CRUD plats, catégories, options, photos
- `/restaurant/horaires` — horaires d'ouverture, jours fermés
- `/restaurant/profil` — infos resto, frais, zone
- `/restaurant/stats` — graphiques (commandes/jour, panier moyen, top plats)

Realtime : nouvelle commande → son + badge animé + push notif navigateur.

---

## Lot 4 — Espace Livreur

Routes sous `/livreur`, protégées par rôle `livreur`.

- `/livreur` — toggle "en ligne / hors ligne", offres de course entrantes (modal avec acceptation/refus 30s timer)
- `/livreur/mission/$id` — détails course, navigation : aller au resto → ramasser → aller chez client → livrer, avec bouton à chaque étape qui pousse un `order_event` et déclenche les notifs côté client
- `/livreur/historique` — courses passées, gains
- `/livreur/gains` — solde, paiements hebdo

Position GPS envoyée toutes les 10s pendant une course → table `driver_locations` (déjà existante) → alimente la carte côté client.

---

## Lot 5 — Espace Admin + finitions

Routes `/admin/*` (déjà amorcées), protégées par rôle `admin`.

- `/admin` — KPIs globaux (commandes/jour, GMV, taux de complétion, restos actifs)
- `/admin/restaurants` — validation, suspension, édition
- `/admin/livreurs` — validation, suspension
- `/admin/commissions` — config commission par catégorie (table existe déjà)
- `/admin/zones` — CRUD zones (table existe déjà)
- `/admin/litiges` — commandes signalées, remboursements
- `/admin/promos` — CRUD codes promo

Finitions globales :
- SEO (head() spécifique par route, OG images)
- Page d'accueil refondue (hero, comment ça marche, témoignages)
- Footer pro
- Mode sombre cohérent partout
- Audit accessibilité (focus visibles, ARIA, contrastes)
- Scan sécurité Cloud + correction RLS

---

## Détails techniques

- **Auth** : email/password + Google déjà en place. Ajout d'un sélecteur de rôle au signup (client / restaurant / livreur). Admin créé manuellement.
- **Realtime** : `supabase.channel()` sur `orders` filtré par `user_id` côté client, par `resto_id` côté resto, par `livreur_id` côté livreur.
- **Cartes** : utilisation d'une lib légère (Leaflet + tuiles OSM) pour éviter les clés Mapbox/Google.
- **Notifications** : Web Notifications API (permission demandée à la 1re commande).
- **Server functions** : création d'ordre, application promo, attribution livreur, calcul ETA — toute la logique sensible côté serveur via `createServerFn`.

---

## Ce que je te livre maintenant si tu valides

J'enchaîne directement le **Lot 1** (toute la structure base de données + seed + RLS). Aucune UI cassée — les pages actuelles continuent de fonctionner sur leurs mocks pendant la transition. Puis on passe au Lot 2.

Une fois le Lot 1 approuvé et testé, dis-moi simplement « lot 2 » et j'enchaîne.
