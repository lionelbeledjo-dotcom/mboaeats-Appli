# Plan — Test E2E console admin

## Objectif
Garantir, via un test automatisé, deux invariants UX de la console `/admin` :
1. La molette de souris fait défiler le contenu sur **toutes** les pages `/admin/*`.
2. Cliquer sur les items de la sidebar ne provoque **aucun rebond visuel** (pas de transform `scale`, pas de saut de layout).

## Stack proposée
- **Playwright** (`@playwright/test`) — déjà éprouvé pour ce type de vérifications, supporte `mouse.wheel`, comparaison de bounding boxes, et tourne en CI.
- Config minimale ciblant le dev server local (`bun run dev` sur `http://localhost:8080` — ou le port Vite utilisé).
- Dossier `e2e/` à la racine + `playwright.config.ts`.
- Scripts npm : `test:e2e` (run), `test:e2e:ui` (debug).

## Authentification admin dans les tests
Les routes `/admin/*` exigent un compte admin. Trois options :
- **A.** Utiliser des identifiants admin de test via variables d'env `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` + un `globalSetup` qui se logge une fois et stocke `storageState.json` réutilisé par tous les tests.
- **B.** Créer un compte admin de test seedé en base (migration ou script).
- **C.** Mocker la session via injection localStorage Supabase.

Je recommande **A** — simple, réaliste, pas d'intrusion code prod. À confirmer avec toi avant d'écrire le test.

## Couverture du test

### Test 1 — Scroll molette sur chaque page admin
Pour chaque route ∈ `[index, commissions, zones, restaurants, menus, livreurs, litiges, clients, commandes, parametres, logs]` :
- Naviguer vers la page.
- Forcer un contenu plus haut que le viewport si nécessaire (viewport 1280×600).
- Lire `window.scrollY` (ou scrollTop du conteneur scrollable).
- Émettre `page.mouse.wheel(0, 800)`.
- Asserter que la position de scroll a augmenté de >0 après wheel.
- Asserter qu'aucun élément ancêtre du `<main>` n'a `overflow: hidden` sur l'axe Y (via `getComputedStyle`).

### Test 2 — Pas de rebond visuel au clic sidebar
- Aller sur `/admin`.
- Capturer la `boundingBox()` du conteneur `<main>` et d'un bouton sidebar avant clic.
- Cliquer sur chaque item sidebar successivement ; à chaque clic, ré-mesurer immédiatement (frame +1) la bbox du bouton cliqué et du `<main>`.
- Asserter : largeur/hauteur du bouton inchangées (pas de `scale`), position X de `<main>` inchangée (pas de shift dû à scrollbar qui apparaît/disparaît).
- Vérifier en plus via JS qu'aucun élément `[data-sidebar-item]` n'a de classe `scale-*` ou de `transform: matrix(...)` non-identité au moment du clic / hover.

## Détails techniques
- `playwright.config.ts` : `webServer: { command: 'bun run dev', port: 8080, reuseExistingServer: true }`.
- `globalSetup.ts` : login via UI `/admin/login` puis `storageState: 'e2e/.auth/admin.json'`.
- Marqueurs DOM utiles à ajouter (petit ajout non-visuel) : `data-testid="admin-main"` sur `<main>` et `data-testid="sidebar-item"` sur chaque NavLink — facultatif si on peut cibler par rôle/aria-label.
- Le test 2 utilise `requestAnimationFrame` côté page pour mesurer juste après le clic, évitant les faux négatifs.

## Livrables
- `playwright.config.ts`
- `e2e/globalSetup.ts`
- `e2e/admin-scroll.spec.ts`
- `e2e/admin-sidebar-no-bounce.spec.ts`
- Mise à jour `package.json` (scripts + devDeps `@playwright/test`)
- Court `e2e/README.md` expliquant variables d'env et `npx playwright install`

## Questions avant build
1. OK pour Playwright (vs Cypress/Vitest browser) ?
2. Stratégie auth : option A (creds via env) confirmée ?
3. Tu fournis un compte admin de test (email/password) ou je documente juste les variables à remplir ?
