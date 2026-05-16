/**
 * MboaEats — Cookie de session côté serveur (états transitoires)
 *
 * AVANT : ce cookie était la source de vérité de l'auth (voir audit C8).
 * APRÈS : il ne porte que des états transitoires non couvrables par le JWT :
 *   - `pendingPhone` : numéro en attente de vérification OTP
 *   - `superadmin2fa` : marqueur de validation 2FA récente
 *
 * Toute info d'identité (userId, roles, email…) provient maintenant
 * EXCLUSIVEMENT du JWT Supabase via `requireAuth.ts`. Voir audit C8.
 */

import { useSession } from "@tanstack/react-start/server";
import { createHash } from "crypto";

const COOKIE_NAME = "mboa_session";
const COOKIE_MAX_AGE_DAYS = 30;

export interface TransientSession {
  /** Numéro de téléphone en cours de vérification OTP. */
  pendingPhone?: string;
  pendingPhoneAt?: number;
  /** Marqueur "2FA superadmin validée" — userId + timestamp. */
  sa2faUserId?: string;
  sa2faAt?: number;
}

/**
 * Retourne l'objet session scellé pour la requête courante.
 * Le secret est dérivé en SHA-256 → toujours 256 bits stables même si
 * la variable d'env est plus courte.
 *
 * @throws si SESSION_SECRET manque (fail-fast au boot)
 */
export function getTransientSession() {
  const raw = process.env.SESSION_SECRET;
  if (!raw) {
    // Fail-fast : sans secret, on ne peut pas signer le cookie ; il vaut
    // mieux crasher au boot que de servir des cookies non protégés.
    throw new Error("SESSION_SECRET manquant — configurez-le avant le démarrage");
  }
  const password = createHash("sha256").update(raw).digest("hex");

  return useSession<TransientSession>({
    password,
    name: COOKIE_NAME,
    maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}

/**
 * Helper : retourne true si le marqueur 2FA superadmin est valide pour ce userId.
 * Validité = présent + même userId + < 12h.
 */
export function isSuperadmin2faValid(
  session: TransientSession,
  userId: string,
): boolean {
  const TTL_MS = 12 * 60 * 60 * 1000;
  return (
    !!session.sa2faAt &&
    session.sa2faUserId === userId &&
    Date.now() - session.sa2faAt < TTL_MS
  );
}
