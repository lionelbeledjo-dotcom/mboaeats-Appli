/**
 * MboaEats — Constantes de configuration serveur.
 *
 * Source unique pour toutes les durées, limites, tailles utilisées par les
 * server functions. Évite la duplication entre OTP, 2FA, rate-limit, etc.
 */

export const SERVER_CONFIG = {
  otp: {
    /** Durée de validité d'un code OTP (5 min). */
    ttlSeconds: 5 * 60,
    /** Nombre max d'essais sur un code avant régénération obligatoire. */
    maxAttempts: 5,
    /** Anti-spam : 30s minimum entre 2 demandes du même téléphone. */
    cooldownSeconds: 30,
    /** Longueur du code OTP. */
    digits: 6,
  },
  superadmin2fa: {
    /** Durée de validité du marqueur 2FA dans la session. */
    sessionTtlHours: 12,
    maxAttempts: 5,
    lockMinutes: 15,
  },
  rateLimit: {
    /** Login mot de passe : max 10 essais / 15 min / IP. */
    loginPerIp: { limit: 10, windowSeconds: 15 * 60 },
    /** Initiation paiement : max 5 / 5 min / user. */
    paymentInitiate: { limit: 5, windowSeconds: 5 * 60 },
  },
  order: {
    /** Items max par commande. */
    maxItems: 50,
    /** Quantité max par item. */
    maxQty: 50,
    /** Montant max d'une commande (XAF). */
    maxTotalXaf: 5_000_000,
  },
  payments: {
    /** Montant max d'un paiement single (XAF). */
    maxAmountXaf: 10_000_000,
  },
} as const;
