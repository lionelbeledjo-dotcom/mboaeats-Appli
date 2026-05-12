

## Vision

Transformer l'auth actuelle (email + magic link partiel) en système production-ready multi-rôles, avec OTP SMS via Twilio, Google Sign-In managé, onboarding 3 écrans, profils riches et mode invité contrôlé.

## Phase 1 — Base de données & rôles

Migration Supabase :

- Enum `app_role` étendu avec `client`, `restaurateur`, `livreur` (admin/superadmin existent déjà).
- Table `profiles` enrichie : `avatar_url`, `phone_verified` (bool), `phone_verified_at`, `default_role` (text), `onboarding_completed` (bool), `preferred_language` (text défaut `fr`).
- Trigger `handle_new_user` mis à jour : crée le profil + assigne automatiquement le rôle `client` dans `user_roles` à l'inscription.
- Bucket Storage `avatars` (public read, upload par utilisateur authentifié sur son dossier).
- Table `payment_methods` (user_id, type `mtn|orange|card`, masked_number, is_default) pour la section "moyens de paiement" du profil.

## Phase 2 — Google OAuth managé + refonte page connexion

- Activation `supabase--configure_social_auth` providers `["google"]` (managé Lovable, zéro config).
- Génération du module `lovable.auth` via outil dédié.
- `src/routes/connexion.tsx` : ajout bouton "Continuer avec Google" (utilise `lovable.auth.signInWithOAuth("google")`), conservation du formulaire email + lien mot de passe oublié + lien création compte (déjà en place).
- `src/routes/inscription.tsx` : ajout choix de rôle à l'inscription (Client par défaut / Je suis restaurateur / Je suis livreur) — stocké dans `user_metadata.intended_role`, attribué après confirmation email.

## Phase 3 — OTP SMS Twilio

Server function `src/lib/sms-otp.functions.ts` :

- `sendPhoneOtp({ phone })` : génère un code 6 chiffres, hash SHA-256 stocké dans `otp_codes` (table existe déjà), envoie SMS via Twilio gateway (`POST /Messages.json` — `TWILIO_API_KEY` + `TWILIO_FROM_NUMBER` déjà configurés). TTL 5 min, max 5 tentatives, rate-limit 1 envoi/min/numéro.
- `verifyPhoneOtp({ phone, code })` : vérifie hash, marque `consumed_at`, met à jour `profiles.phone` + `phone_verified=true`.
- Composant `<PhoneVerificationDialog />` réutilisable (input téléphone E.164 Cameroun préfixé +237, étape 1 saisie / étape 2 code 6 chiffres avec resend après 60s).
- Branchement dans `inscription.tsx` (étape post-email pour utilisateurs qui veulent vérifier leur numéro) et dans `compte.securite.tsx` (vérification à tout moment).

## Phase 4 — Profils, dashboards par rôle, mode invité

**Profil client** (`src/routes/profil.tsx` enrichi) :

- En-tête : avatar (upload Storage `avatars`), nom, badge téléphone vérifié.
- Sections : adresses sauvegardées (table `addresses` existe), historique commandes (table `orders` existe — affichage 10 dernières), moyens de paiement (nouvelle table).

**Dashboards par rôle** (route guard via `_authenticated/`) :

- `src/routes/restaurant.tsx` (existe) → vérification rôle `restaurateur`, sinon CTA "Devenir restaurateur" → `/devenir-resto`.
- `src/routes/livreur.tsx` (existe) → vérification rôle `livreur`, sinon CTA "Devenir livreur" → `/devenir-livreur`.
- Hook `useUserRoles()` qui interroge `user_roles` via server fn dédié.

**Mode invité** :

- Suppression de tout `requireAuth` sur la home, la liste restaurants, la fiche resto, la recherche.
- `src/routes/checkout.tsx` : si non-connecté → modal "Connectez-vous pour finaliser" avec 3 options (Email, Google, Téléphone OTP) + redirect-back vers `/checkout` après login (`?redirect=/checkout`).
- Le panier Zustand reste persistant en localStorage et survit au login (déjà OK).

## Phase 5 — Onboarding 3 écrans + récupération mot de passe

**Onboarding** :

- 3 illustrations IA (premium quality) générées : "Découvrir les saveurs du Cameroun", "Commander en 2 clics", "Suivre ton livreur en direct".
- Composant `<OnboardingCarousel />` plein écran, swipe + dots + boutons "Passer" / "Suivant" / "Commencer".
- Affiché uniquement si `localStorage.mboa_onboarding_seen !== "1"` ET (utilisateur non connecté OU `profiles.onboarding_completed = false`).
- Marqué vu à la fin → `localStorage` + update profil si connecté.
- Monté dans `__root.tsx` au-dessus de `<Outlet />`.

**Récupération mot de passe** :

- Page `/mot-de-passe-oublie` (nouvelle) : champ email → `supabase.auth.resetPasswordForEmail` avec `redirectTo: window.location.origin + '/reset-password'`.
- `/reset-password` (existe déjà) : vérifier qu'elle gère `type=recovery` + `updateUser({ password })`.
- Option "Recevoir un code SMS" si l'utilisateur a un numéro vérifié → réutilise OTP de Phase 3 + écran de saisie nouveau mot de passe.

## Section technique

**Sécurité** :

- Toutes les server fn OTP utilisent `supabaseAdmin` (bypass RLS) car elles écrivent dans `otp_codes` côté serveur. RLS reste active.
- Validation Zod stricte sur tous les inputs (téléphone E.164 `+237\d{9}`, code `\d{6}`, password min 8 + 1 majuscule + 1 chiffre).
- Rate-limit OTP en mémoire process (acceptable pour MVP, à migrer Redis plus tard).
- HIBP activé via `configure_auth({ password_hibp_enabled: true })`.

**Architecture fichiers nouveaux** :

```
src/lib/
  sms-otp.functions.ts          # send/verify OTP via Twilio
  user-roles.functions.ts        # getMyRoles, requestRole(restaurateur|livreur)
  profile.functions.ts           # updateProfile, uploadAvatar
src/components/
  PhoneVerificationDialog.tsx
  OnboardingCarousel.tsx
  GoogleSignInButton.tsx
  GuestCheckoutGate.tsx
  RoleGuard.tsx                  # affiche CTA si rôle manquant
src/hooks/
  useUserRoles.ts
  useOnboarding.ts
src/routes/
  mot-de-passe-oublie.tsx
  _authenticated.tsx             # layout avec beforeLoad redirect /connexion
src/assets/onboarding/
  step-1.jpg, step-2.jpg, step-3.jpg   # IA premium
```

**Ce que je NE touche PAS** :

- `connexion.tsx` (uniquement +bouton Google), `inscription.tsx` (uniquement +choix rôle), `reset-password.tsx`.
- Logique panier / commande / paiement Campay.
- Routes admin / superadmin.

**Ordre d'exécution** : Phase 1 (DB) → Phase 2 (Google + UI auth) → Phase 3 (OTP) → Phase 4 (profils/rôles/invité) → Phase 5 (onboarding + reset). Chaque phase est livrable indépendamment.

**Estimation** : ~25-30 fichiers créés/modifiés au total. Je livre phase par phase et te demande validation entre chaque (sinon trop risqué de tout casser d'un coup).

