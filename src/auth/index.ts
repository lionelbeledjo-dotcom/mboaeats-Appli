/**
 * MboaEats — Barrel d'exports du sous-système auth.
 *
 * Importez TOUJOURS depuis `@/auth` plutôt que depuis les sous-modules :
 *
 *   import { requireAuth, requirePlatformAdmin, assertMembership } from "@/auth";
 *   import type { Principal, RestaurantRole } from "@/auth";
 *
 * Cela permet de refactorer la structure interne sans casser les imports.
 */

// Types
export type {
  PlatformRole,
  RestaurantRole,
  MembershipStatus,
  RestaurantMembership,
  Principal,
  ClientSession,
} from "./types";

export {
  RESTAURANT_ROLE_WEIGHT,
  hasMinRestaurantRole,
  isPlatformAdmin,
  isPlatformSuperadmin,
  isDriver,
  hasMembership,
  findMembership,
  accessibleRestaurantIds,
} from "./types";

// Server (utilisable côté server functions / loaders SSR uniquement)
export { getCurrentPrincipal, clearServerSession } from "./session.functions";

// Middlewares (server-only)
export { requireAuth } from "./middlewares/requireAuth";
export {
  requirePlatformAdmin,
  requirePlatformSuperadmin,
} from "./middlewares/requirePlatformAdmin";
export {
  assertMembership,
  type MembershipContext,
} from "./middlewares/requireMembership";
export {
  requireDriver,
  assertDriverAssignedToOrder,
} from "./middlewares/requireDriver";
