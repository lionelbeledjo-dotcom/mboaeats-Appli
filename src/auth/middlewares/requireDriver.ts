/**
 * MboaEats — Middleware: requireDriver
 *
 * Exige le rôle plateforme `livreur` ET (optionnellement) que la commande
 * cible soit assignée à ce driver.
 *
 * Comme requireMembership, on expose un helper `assertDriverAssignedToOrder`
 * pour les vérifications par-commande qui dépendent de la payload.
 */

import { createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAuth } from "./requireAuth";

function forbidden(message: string): never {
  throw new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export const requireDriver = createMiddleware({ type: "function" })
  .middleware([requireAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "livreur")
      .maybeSingle();

    if (error) forbidden("Driver role check failed");
    if (!data) forbidden("Driver role required");

    return next({ context: { isDriver: true as const } });
  });

/**
 * Helper : vérifie que la commande est assignée à ce driver (auth.uid()).
 * À appeler dans le handler après inputValidator.
 */
export async function assertDriverAssignedToOrder(
  context: { userId: string },
  orderId: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("driver_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (error) forbidden("Order lookup failed");
  if (!data) {
    throw new Response(JSON.stringify({ error: "Commande introuvable" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (data.driver_id !== context.userId) {
    forbidden("Commande non assignée à ce livreur");
  }
}
