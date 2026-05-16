# Refonte architecturale MBOAEAT — niveau Uber Eats

Objectif : remplacer les patchs accumulés par une architecture où le shell (Header + Outlet + BottomDock) ne se démonte jamais, où chaque route a son propre Suspense + ErrorBoundary, et où la session, le scroll et le panier sont stables.

## 1. AppShell persistante (`src/routes/__root.tsx`)

Refonte du `RootComponent` pour garantir qu'aucun changement de route ne démonte le layout :

```text
<QueryClientProvider>
  <ThemeProvider>
    <AuthProvider>                 ← attend getSession() avant de rendre les enfants
      <SplashScreen />
      <OfflineBanner />
      <AppShell>                   ← nouveau composant stable
        <SiteHeader />             ← monté une seule fois
        <main id="app-scroll">
          <RouteErrorBoundary>     ← boundary GLOBAL léger (jamais full-screen)
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </main>
        <CartFab />
        <BottomDock />             ← fixed, jamais démonté
      </AppShell>
      <Toaster />
      <PendingPaymentWatcher />
      <OnboardingGate />
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
```

Règle : Header + BottomDock vivent en dehors de `<Outlet />`. Les pages n'ont plus le droit de rendre leur propre Header/Dock.

## 2. Session stabilisée (`src/auth/components/AuthProvider.tsx`)

- Attend `supabase.auth.getSession()` avant de rendre les enfants.
- Tant que `!sessionLoaded` → `<FullScreenLoader />` (pas de splash répétitif, pas de flash).
- Le listener `onAuthStateChange` met à jour le state SANS provoquer de re-mount du shell.
- Supprime les guards qui redirigent en cours de render (cause majeure des "Une erreur est survenue").

## 3. Routes Profil & Commandes — Suspense + ErrorBoundary locaux

Pour `src/routes/profil.tsx` et `src/routes/commandes.tsx` :

- `pendingComponent: SkeletonProfil` / `SkeletonOrders`
- `errorComponent: LocalErrorFallback` (carte inline avec "Réessayer", JAMAIS plein écran)
- Données via `useQuery` :
  ```ts
  useQuery({
    queryKey: ['orders', userId],
    queryFn: fetchOrders,
    enabled: authReady && !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })
  ```
- Si non connecté → carte "Connexion requise" inline (déjà en place, on garde).

## 4. Scroll stabilité totale

- `src/router.tsx` : `scrollRestoration: true`, `scrollToTopSelectors: ['#app-scroll']`.
- `BottomDock` : tous les `<Link>` gardent `resetScroll={false}` pour les onglets latéraux (panier/profil/commandes), `true` uniquement pour Accueil.
- CSS (`src/styles.css`) :
  - `html, body { height: 100dvh; overflow: hidden; }`
  - `#app-scroll { height: 100dvh; overflow-y: auto; padding-bottom: calc(var(--bottom-dock-h) + env(safe-area-inset-bottom)); overscroll-behavior: contain; }`
  - Variable `--bottom-dock-h` définie en root.
- Suppression du double overflow (body + main).

## 5. Panier (`src/routes/panier.tsx`)

- Le contenu du panier reste dans `<Outlet />` comme une route normale (plus d'overlay fixed qui se superpose au layout).
- Bouton "Passer au paiement" en `position: sticky; bottom: calc(var(--bottom-dock-h) + safe-area)`.
- Plus de `useScrollLock` sur cette route (le shell gère déjà l'overflow).
- `CartProvider` (store Zustand existant) reste inchangé — il ne re-render pas l'AppShell.

## 6. ErrorBoundaries

- `RouteErrorBoundary` (nouveau, léger) autour de `<Outlet />` : log + fallback inline + bouton "Recharger cet écran" qui appelle `router.invalidate()` + reset.
- `RootErrorBoundary` actuel : conservé UNIQUEMENT autour de Splash/Onboarding (catastrophes hors route).
- Suppression du `DefaultErrorComponent` plein écran dans `router.tsx` au profit du même fallback inline.

## 7. Performance

- `defaultPreload: 'intent'` (déjà), `defaultPreloadStaleTime: 0` à vérifier dans `router.tsx`.
- `usePrefetchOnIdle` étendu à `/checkout`.
- Lazy images via `loading="lazy"` (audit rapide).

## Fichiers touchés

- `src/routes/__root.tsx` — nouveau shell stable
- `src/components/AppShell.tsx` (nouveau)
- `src/components/RouteErrorBoundary.tsx` (nouveau, remplace TabErrorBoundary)
- `src/components/RouteSkeleton.tsx` (nouveau)
- `src/auth/components/AuthProvider.tsx` — attend getSession
- `src/router.tsx` — scrollRestoration + selectors
- `src/routes/profil.tsx` — pendingComponent + errorComponent + useQuery enabled
- `src/routes/commandes.tsx` — idem
- `src/routes/panier.tsx` — supprime overlay fixed + scrollLock, sticky CTA
- `src/components/BottomDock.tsx` — confirme resetScroll par lien
- `src/styles.css` — 100dvh, --bottom-dock-h, #app-scroll
- `src/hooks/useScrollLock.ts` — déprécié (gardé pour modales seulement)

## Section technique

- TanStack Router `scrollRestoration` gère la sauvegarde par clé d'historique sur `#app-scroll`. Pas besoin de logique manuelle.
- `Suspense` au niveau root + `pendingComponent` par route = squelette instantané sans démontage du shell.
- Session : `AuthProvider` expose `{ session, ready }` via React Query (`queryKey: ['session']`) — déjà partiellement en place avec `useSyncSupabaseAuthEvents`, on ajoute le `ready` flag bloquant.
- Le panier en route normale (au lieu d'overlay) supprime définitivement les scroll jumps liés à `position: fixed` sur body.

## Hors scope

- Pas de changement de schéma DB.
- Pas de modification du store Zustand panier.
- Pas de modification des server functions existantes (`getMyOrders`, etc.).

Confirme et j'implémente l'ensemble en un seul passage.
