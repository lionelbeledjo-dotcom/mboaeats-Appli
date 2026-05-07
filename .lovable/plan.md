## Objectif

Vous permettre d'accéder à la console **/admin** (restaurants, livreurs, commissions, litiges, paramètres) en vous connectant simplement avec votre numéro **+33 6 60 06 17 23** via OTP, sans avoir besoin du compte email/mot de passe existant.

## Situation actuelle

- Un seul compte admin existe en base (créé le 6 mai), accessible uniquement via `/admin-login` (email + mot de passe).
- Vous vous connectez actuellement via `/connexion` (téléphone + OTP SMS), ce qui crée un compte Supabase Auth séparé sans rôle admin.
- Aucun profil n'existe encore pour `+33660061723` → il faut d'abord créer la session, puis attribuer le rôle.

## Plan d'action

### 1. Création d'un mécanisme « Devenir admin »

Ajouter une fonction serveur sécurisée `claimAdminByPhone` qui :
- Exige une session OTP valide (middleware `requireSupabaseAuth`)
- Vérifie que le numéro de téléphone du compte connecté est dans une **allowlist** hardcodée côté serveur : `+33660061723` (modifiable plus tard)
- Insère le rôle `admin` dans `user_roles` pour ce `user_id` (idempotent via `on conflict do nothing`)
- Retourne `{ ok: true }` ou une erreur claire

### 2. Bouton d'activation dans la page Connexion

Après une connexion OTP réussie, si le numéro du compte est dans l'allowlist et qu'il n'a pas encore le rôle admin, afficher un bouton « **Activer l'accès administrateur** » qui appelle `claimAdminByPhone` puis redirige vers `/admin`.

### 3. Élargir le portail d'accès à /admin

Modifier `/admin-login` (et `/admin` `beforeLoad`) pour accepter **toute session Supabase valide** ayant le rôle admin — qu'elle vienne de email/mot de passe OU d'OTP téléphone. Aucun changement nécessaire si le rôle est déjà attribué : la garde actuelle (`user_roles.role = 'admin'`) fonctionne déjà avec n'importe quel type de session.

### 4. Lien direct depuis le menu

Ajouter un raccourci « **Console admin** » dans le menu profil/dock pour les utilisateurs ayant le rôle admin, afin que vous puissiez accéder à `/admin` en un clic depuis n'importe quelle page.

## Détails techniques

```text
src/lib/admin-claim.functions.ts   (nouveau)
  └─ claimAdminByPhone: createServerFn + requireSupabaseAuth
       allowlist = ["+33660061723"]
       → supabaseAdmin.from("user_roles").upsert({ user_id, role: "admin" })

src/routes/connexion.tsx   (modifié)
  └─ après verifyOtp, check phone vs allowlist
     → afficher CTA "Activer l'accès administrateur"
     → appel claimAdminByPhone → navigate("/admin")

src/components/BottomDock.tsx ou menu profil   (modifié)
  └─ si user a role=admin → afficher entrée "Console admin" → /admin
```

## Sécurité

- L'allowlist vit **uniquement côté serveur** (impossible à manipuler depuis le navigateur).
- La fonction exige une session OTP vérifiée (le téléphone du token est cryptographiquement lié au compte).
- RLS sur `user_roles` reste inchangée ; l'insertion passe par `supabaseAdmin` après validation explicite.
- Aucun impact sur les autres comptes : seul `+33660061723` peut s'auto-promouvoir.

## Résultat

Une fois le plan implémenté :
1. Vous vous connectez sur `/connexion` avec `+33 6 60 06 17 23` + code SMS.
2. Un bouton « Activer l'accès administrateur » apparaît → un clic.
3. Vous arrivez sur `/admin` avec accès complet à : Restaurants, Livreurs, Commissions, Zones, Litiges, Paramètres.
4. Lors des prochaines connexions, le rôle est déjà actif → un raccourci « Console admin » dans le menu vous y emmène directement.
