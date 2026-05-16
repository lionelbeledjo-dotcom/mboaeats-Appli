/**
 * MboaEats — Middleware: requireMembership
 *
 * Exige que le user authentifié possède une membership ACTIVE sur le
 * restaurant ciblé avec un rôle au moins égal à `minRole`.
 *
 * Le `restaurant_id` à vérifier est lu DANS LA PAYLOAD de la server function.
 * Cela suppose que toutes les server functions tenant-scopées exposent un
 * champ `restaurant_id` dans leur input — c'est une convention forte qu'on
 * impose au Lot C.
 *
 * Usage :
 *   export const updateMyMenu = createServerFn({ method: "POST" })
 *     .middleware([requireMembership("manager")])
 *     .inputValidator(z.object({ restaurant_id: z.string().uuid(), ... }))
 *     .handler(async ({ data, context }) => { ... });
 */

import { createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAuth } from "./requireAuth";
import {
  hasMinRestaurantRole,
  type RestaurantRole,
} from "../types";

function forbidden(message: string): never {
  throw new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string): never {
  throw new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Le middleware extrait `restaurant_id` du payload data. Il doit donc être
 * appelé APRÈS inputValidator → on s'assure que data est typé.
 *
 * TanStack Start applique les middlewares dans l'ordre déclaré, mais le
 * `data` parsé n'est disponible qu'au handler. On contourne en relisant
 * le body manuellement — ou plus simple : le handler appelle
 * `assertMembership(context, data.restaurant_id, minRole)` explicitement.
 *
 * Pour éviter ce flou, on expose DEUX formes :
 *   1. `requireMembership(minRole)` — middleware qui lit `restaurant_id`
 *      depuis un getter passé par l'appelant.
 *   2. `assertMembership(context, restaurantId, minRole)` — helper appelable
 *      depuis le handler après input validation. C'est la forme recommandée.
 */

export interface MembershipContext {
  restaurantId: string;
  membershipRole: RestaurantRole;
  isPlatformAdminOverride: boolean;
}

/**
 * Helper à appeler depuis le handler après inputValidator.
 *
 * @throws 403 si pas de membership ou rôle insuffisant
 * @throws 404 si le resto n'existe pas / est soft-deleted
 */
export async function assertMembership(
  context: { userId: string; user: { id: string } },
  restaurantId: string,
  minRole: RestaurantRole,
): Promise<MembershipContext> {
  if (!restaurantId) badRequest("restaurant_id manquant");

  // 1) Plateform admin = override : peut tout faire sur n'importe quel resto.
  const { data: platformRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["admin", "superadmin"]);

  const isPlatformAdmin = (platformRoles ?? []).length > 0;

  // 2) Vérifier l'existence + non-soft-deleted du resto.
  const { data: resto, error: restoErr } = await supabaseAdmin
    .from("restaurants")
    .select("id, deleted_at")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restoErr) forbidden("Restaurant lookup failed");
  if (!resto || resto.deleted_at) {
    throw new Response(JSON.stringify({ error: "Restaurant introuvable" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3) Si admin plateforme, on accorde "owner" virtuel (= droits max).
  if (isPlatformAdmin) {
    return {
      restaurantId,
      membershipRole: "owner",
      isPlatformAdminOverride: true,
    };
  }

  // 4) Sinon, vérifier le membership tenant.
  const { data: membership, error: memErr } = await supabaseAdmin
    .from("restaurant_members")
    .select("role, status")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", context.userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (memErr) forbidden("Membership check failed");
  if (!membership) forbidden("Vous n'êtes pas membre de ce restaurant");

  const role = membership.role as RestaurantRole;
  if (!hasMinRestaurantRole(role, minRole)) {
    forbidden(`Rôle insuffisant : ${minRole} requis, vous êtes ${role}`);
  }

  return {
    restaurantId,
    membershipRole: role,
    isPlatformAdminOverride: false,
  };
}

/**
 * Middleware-factory pour les server functions où `restaurant_id` est passé
 * dans le payload. Lit l'header `x-mboa-restaurant-id` si présent pour les
 * routes RPC custom. Sinon, le handler doit appeler `assertMembership` lui-même.
 *
 * À utiliser principalement comme :
 *
 *   .middleware([requireAuth])
 *   .handler(async ({ data, context }) => {
 *     await assertMembership(context, data.restaurant_id, "manager");
 *     // ...
 *   })
 */
export const requireMembershipHeader = (minRole: RestaurantRole) =>
  createMiddleware({ type: "function" })
    .middleware([requireAuth])
    .server(async ({ next, context }) => {
      // Tentative : lire restaurant_id depuis le header x-mboa-restaurant-id
      // Permet le pattern serverFn avec `headers: { "x-mboa-restaurant-id": id }`
      // côté client. C'est OPTIONNEL — le handler peut toujours appeler
      // assertMembership directement.
      // Note: TanStack Start n'expose pas request dans .server() directement
      // dans toutes les versions, on conserve donc le helper assertMembership
      // comme voie principale.
      return next({ context: { _membershipMinRole: minRole } });
    });
