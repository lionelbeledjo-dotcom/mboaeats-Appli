/**
 * MboaEats — Types unifiés du sous-système d'authentification
 *
 * Source de vérité unique pour TOUT le code applicatif. Tout fichier qui
 * a besoin de connaître l'identité ou les permissions d'un user doit
 * importer depuis `@/auth/types` — jamais directement depuis Supabase.
 */

/** Rôles plateforme (équipe MboaEats interne). Reflète enum SQL `app_role`. */
export type PlatformRole = "superadmin" | "admin" | "livreur";

/** Rôles tenant (à l'intérieur d'un restaurant). Reflète enum SQL `restaurant_role`. */
export type RestaurantRole = "owner" | "manager" | "staff" | "kitchen";

/** Statut d'un membership tenant. Reflète enum SQL `member_status`. */
export type MembershipStatus = "active" | "invited" | "suspended";

/** Poids hiérarchique d'un rôle tenant — miroir de `restaurant_role_weight()` en SQL. */
export const RESTAURANT_ROLE_WEIGHT: Record<RestaurantRole, number> = {
  owner: 4,
  manager: 3,
  staff: 2,
  kitchen: 1,
};

/** Compare deux rôles tenant. Retourne true si `actual` >= `required`. */
export function hasMinRestaurantRole(
  actual: RestaurantRole,
  required: RestaurantRole,
): boolean {
  return RESTAURANT_ROLE_WEIGHT[actual] >= RESTAURANT_ROLE_WEIGHT[required];
}

/**
 * Membership d'un user dans un restaurant donné.
 * Vient de la table `restaurant_members`.
 */
export interface RestaurantMembership {
  restaurant_id: string;
  role: RestaurantRole;
  status: MembershipStatus;
  joined_at: string;
}

/**
 * Principal = identité authentifiée résolue côté serveur.
 *
 * Différent de la `Session` brute Supabase : on a déjà résolu les rôles
 * plateforme et les memberships, donc utilisable directement pour les
 * vérifications d'accès.
 */
export interface Principal {
  userId: string;
  email: string | null;
  phone: string | null;
  /** Rôles plateforme (peut être vide pour un simple client). */
  platformRoles: PlatformRole[];
  /** Memberships tenant actifs uniquement. */
  memberships: RestaurantMembership[];
  /** Marqueur 2FA superadmin valide pour la session courante. */
  superadmin2faValid: boolean;
}

/** État côté client. */
export type ClientSession =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; principal: Principal };

// -----------------------------------------------------------------------------
// Helpers de prédicats — utilisés par les hooks/components et les middlewares.
// -----------------------------------------------------------------------------

export function isPlatformAdmin(p: Principal): boolean {
  return p.platformRoles.includes("admin") || p.platformRoles.includes("superadmin");
}

export function isPlatformSuperadmin(p: Principal): boolean {
  return p.platformRoles.includes("superadmin");
}

export function isDriver(p: Principal): boolean {
  return p.platformRoles.includes("livreur");
}

export function hasMembership(
  p: Principal,
  restaurantId: string,
  minRole: RestaurantRole = "kitchen",
): boolean {
  return p.memberships.some(
    (m) =>
      m.restaurant_id === restaurantId &&
      m.status === "active" &&
      hasMinRestaurantRole(m.role, minRole),
  );
}

export function findMembership(
  p: Principal,
  restaurantId: string,
): RestaurantMembership | null {
  return (
    p.memberships.find(
      (m) => m.restaurant_id === restaurantId && m.status === "active",
    ) ?? null
  );
}

/** Liste des restaurants accessibles à ce principal avec un rôle min. */
export function accessibleRestaurantIds(
  p: Principal,
  minRole: RestaurantRole = "kitchen",
): string[] {
  return p.memberships
    .filter(
      (m) => m.status === "active" && hasMinRestaurantRole(m.role, minRole),
    )
    .map((m) => m.restaurant_id);
}
