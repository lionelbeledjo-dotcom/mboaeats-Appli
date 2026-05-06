# Checklist de tests — Son du panier (WebAudio)

Le son du panier utilise `AudioContext` et nécessite un déverrouillage par geste utilisateur (exigence iOS Safari). Cette checklist couvre iOS Safari, Android Chrome et les navigateurs desktop.

## Préparer la session

1. Ouvrir le site en mode dev (`bun dev`) ou un build de preview.
2. Ouvrir la console du navigateur.
3. Activer le son depuis **Profil → Préférences → Son du panier**.
4. (Optionnel) Dans la console : `window.__cartSoundDiag()` — affiche un tableau avec :
   - `enabled` (préférence)
   - `unlocked` (geste utilisateur reçu)
   - `ctxState` (`running` / `suspended` / `closed`)
   - `sampleRate`, `hasAudioContext`, `hasWebkitAudioContext`, `ua`

Tous les logs sont préfixés `[cart-sound]` et n'apparaissent **qu'en mode dev** (`import.meta.env.DEV`).

## Logs attendus (chronologiquement)

| Étape | Log attendu |
|---|---|
| Chargement de la page | `[cart-sound] unlock listeners attached { ua: ... }` |
| Premier tap/click/touch | `[cart-sound] AudioContext created { state, sampleRate }` puis `unlocked via click/touchend → state: running` |
| Activation du toggle | `[cart-sound] played add { state: "running", t: ... }` |
| Ajout au panier | `[cart-sound] played add ...` |
| Suppression | `[cart-sound] played remove ...` |
| Avant tout geste | `[cart-sound] skip (no ctx) add` (si une lecture est tentée) |
| Son désactivé | `[cart-sound] skip (disabled) add` |

## iOS Safari (iPhone/iPad)

- [ ] Charger la page → **aucun son** ne doit jouer automatiquement.
- [ ] Console (via Mac → Develop → iPhone) : voir `unlock listeners attached`.
- [ ] Toucher n'importe où (sans rien sélectionner) → log `unlocked via touchend → state: running`.
- [ ] Activer le toggle son → un petit bip se fait entendre.
- [ ] Ajouter un plat → bip ascendant (660→990 Hz).
- [ ] Supprimer un plat → bip descendant (520→280 Hz).
- [ ] Mettre l'iPhone en mode silencieux (interrupteur latéral) → **pas de son** (comportement iOS attendu, pas un bug).
- [ ] Recharger la page → le déverrouillage est nécessaire à nouveau (`unlocked: false` au démarrage).
- [ ] Mettre le navigateur en arrière-plan puis revenir → vérifier que `ctxState` redevient `running` après le prochain geste.

## Android Chrome

- [ ] Charger la page → pas de son auto.
- [ ] Premier tap → log `unlocked via touchend`. `ctxState` passe à `running`.
- [ ] Ajout/suppression → bips audibles.
- [ ] Couper le son média (volume hardware) → silencieux mais aucune erreur console.
- [ ] Tester en navigation privée → comportement identique.

## Desktop (Chrome / Edge / Firefox / Safari macOS)

- [ ] Charger la page → pas de son auto (politique d'autoplay).
- [ ] Premier clic → log `unlocked via click → state: running`.
- [ ] Activer le toggle → bip de confirmation.
- [ ] Ajout/suppression de panier → bips.
- [ ] Désactiver le toggle → log `skip (disabled)` lors des prochaines actions.
- [ ] Firefox : vérifier qu'aucune erreur `webkitAudioContext` n'apparaît (fallback OK).
- [ ] Safari macOS : `hasWebkitAudioContext` peut être `true`, `hasAudioContext` aussi → on utilise le standard.

## Cas limites

- [ ] Onglet en arrière-plan pendant un ajout → pas d'erreur, son joué quand l'onglet revient au premier plan (ou skippé silencieusement).
- [ ] localStorage indisponible (mode privé strict) → `isCartSoundEnabled()` renvoie `false`, aucune exception.
- [ ] Plusieurs ajouts rapides successifs → chaque bip joue sans saturer la console.
- [ ] Build production (`bun run build` puis preview) → **aucun log `[cart-sound]`** ne doit apparaître. `window.__cartSoundDiag` doit être `undefined`.

## Diagnostic rapide

Si aucun son ne sort :

1. `window.__cartSoundDiag()` dans la console.
2. Si `enabled: false` → activer dans Profil.
3. Si `unlocked: false` → cliquer/toucher la page une fois.
4. Si `ctxState: "suspended"` → un nouveau geste devrait le repasser à `running`.
5. Si `hasAudioContext: false && hasWebkitAudioContext: false` → navigateur non supporté, comportement de fallback silencieux attendu.
