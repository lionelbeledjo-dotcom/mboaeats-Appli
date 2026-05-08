## Objectif

Faire passer MboaEats en standard "production réel" avec :
1. Refonte visuelle des pages restaurant/menu (style fourni)
2. Authentification réelle Supabase (email/password + Google + OTP email natif)
3. Refonte panier flottant + checkout pro
4. Connexion réelle aux tables (`profiles`, `restaurants`, `dishes`, `orders`, `order_items`, `addresses`, `promos`)

Note : l'image `image_2a188e.jpg` n'a pas pu être (ré)uploadée. J'applique le brief texte (fond blanc, coins très arrondis, cartes photo-gauche / texte-droite, badges pilules noires/blanches, bottom dock flottant noir, Add-to-cart noir flottant, Promotion verte). Tu pourras me corriger après le premier rendu.

---

## 1. Authentification réelle Supabase

**Activations backend** (via tooling Lovable Cloud) :
- `supabase--configure_auth` : `auto_confirm_email: false`, HIBP activé, signup ouvert.
- `supabase--configure_social_auth` : enable Google (managed OAuth, sans clés à fournir).
- Migration : trigger `handle_new_user` qui crée automatiquement une ligne `profiles` (full_name, phone) à chaque signup `auth.users`.

**Frontend** (`/connexion`) refonte :
- Onglets : **Se connecter** / **S'inscrire**.
- Login : email + mot de passe → `supabase.auth.signInWithPassword`.
- Signup : Nom complet + Email + Téléphone + Mot de passe → `supabase.auth.signUp` avec `emailRedirectTo: window.location.origin/`, métadonnées `{ full_name, phone }` (récupérées par le trigger).
- Bouton **Continuer avec Google** (icône SVG officielle multi-couleurs) → `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- Validation OTP email Supabase native : après signup, écran "Vérifie ton email" + champ code 6 chiffres → `supabase.auth.verifyOtp({ type: 'signup', email, token })`.
- Conserver l'OTP SMS Twilio existant comme méthode secondaire (onglet "Téléphone") — non supprimé.
- Inputs : `text-foreground` sur `bg-white`, contraste WCAG AA garanti.
- Validation Zod côté client (email, téléphone E.164, password ≥ 8 + 1 chiffre + 1 majuscule).

**Session** :
- Hook `useAuth()` basé sur `supabase.auth.onAuthStateChange` + `getSession`.
- Layout `_authenticated` (déjà partiellement présent via session iron) : ajouter garde basée sur la session Supabase pour `/compte.*`, `/checkout`, `/commandes`, `/favoris`.

---

## 2. Refonte design "Menu Intérieur"

**Tokens design** (`src/styles.css`) :
- `--surface-card: oklch(1 0 0)`, `--ink: oklch(0.18 0 0)`, `--ink-soft: oklch(0.45 0 0)`.
- `--radius-card: 1.25rem`, `--radius-pill: 999px`.
- `--shadow-float: 0 12px 32px -12px rgb(0 0 0 / 0.18)`.
- Vert promo `--promo: oklch(0.72 0.17 152)` (≈ #22C55E).

**Page restaurant** (`src/routes/r.$slug.tsx` ou `restaurants.$restoId.tsx`) :
- Fond blanc, header image en cover arrondi.
- Section catégories : pilules horizontales scrollables (noir actif / blanc inactif, bordure fine).
- Cartes plat : layout `flex` photo 96×96 `rounded-2xl` à gauche, à droite Nom (font-semibold), description 1 ligne tronquée, ligne basse `Prix • Calories`. Badge "Most Popular" / "Under 2000 FCFA" en pilule absolue top-left.
- Plus de design sombre — passage uniforme blanc/noir.

**Bottom dock** (`src/components/BottomDock.tsx`) :
- Container flottant `mx-auto bottom-4`, `bg-black text-white`, `rounded-full`, `shadow-float`.
- Icônes Lucide stroke-2, blanches, item actif avec dot vert.

**Add-to-cart flottant** :
- Sur page resto, FAB pleine largeur sticky bas : `bg-black text-white rounded-full h-14`, contenu `Voir le panier · {qty} articles · {total} FCFA`.
- Cache automatiquement quand panier vide.

---

## 3. Panier & Checkout pro

**Checkout** (`src/routes/checkout.tsx`) :
- Bloc 1 — **Adresse de livraison** : sélection address par défaut + carte simplifiée (placeholder Mapbox-like statique : div blanche avec dot vert + ligne pointillée vers pin noir, ETA "≈ 15 min" en pilule).
- Bloc 2 — **Récap articles** : liste compacte qty × nom — prix.
- Bloc 3 — **Code promo** : input + bouton Appliquer (vérifie `promos` actif, expires_at, min_order). Si OK → ligne verte `Promotion appliquée −{remise}` avec icône check.
- Bloc 4 — **Total** : sous-total / livraison / promo / total.
- Bouton final noir flottant `Payer {total} FCFA`.
- Création réelle de `orders` + `order_items` (RLS user_id = auth.uid). Paiement Campay déjà existant conservé.

---

## 4. Données réelles & cohérence

- `useSessionUser` (existant, basé iron-session) → conservé pour OTP SMS, mais nouvelles pages utilisent `useAuth()` Supabase.
- `useCart` : déjà local, on persiste `localStorage` (déjà présent), on le branche au checkout réel.
- Les listings `restaurants` / `dishes` : déjà en place via `marketplace.functions.ts`. Vérifier que le redesign consomme bien ces données.
- Profil créé automatiquement à signup via trigger SQL.

---

## Détails techniques

**Migration SQL** (une seule passe) :
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, phone)
  values (new.id,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'phone')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Fichiers principaux modifiés/créés** :
- `src/routes/connexion.tsx` — refonte complète (tabs login/signup + Google + OTP)
- `src/hooks/useAuth.ts` — nouveau, wrap Supabase Auth
- `src/components/BottomDock.tsx` — restyle noir flottant
- `src/components/AddToCartFab.tsx` — nouveau FAB noir
- `src/routes/r.$slug.tsx` — refonte cartes plats + badges
- `src/routes/checkout.tsx` — refonte 4 blocs + promo verte
- `src/styles.css` — nouveaux tokens
- `src/integrations/lovable/*` — généré par `configure_social_auth`

---

## Découpage en livraisons (un tour = une étape)

```text
Étape 1 ─ Backend Auth
  • configure_auth + Google OAuth
  • migration trigger profiles
  • hook useAuth + garde _authenticated

Étape 2 ─ Page /connexion refondue
  • tabs Login/Signup, Google, OTP email
  • garde l'OTP SMS Twilio en option

Étape 3 ─ Tokens design + BottomDock + Page restaurant
  • styles.css, BottomDock noir flottant
  • cartes plats photo+texte, badges pilules

Étape 4 ─ Add-to-cart FAB + Checkout pro
  • FAB noir bas resto
  • checkout 4 blocs + promo verte + ordres réels
```

Je démarre par **l'étape 1 (backend + hook auth)** dès que tu valides ce plan.
