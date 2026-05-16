/**
 * MboaEats — Middlewares: requirePlatformAdmin / requirePlatformSuperadmin
 *
 * `requirePlatformAdmin`  : admin OU superadmin global (lecture/écriture admin)
 * `requirePlatformSuperadmin` : superadmin seul + 2FA récente obligatoire
 *
 * Tous deux chaînent sur requireAuth.
 */

import { createMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAuth } from "./requireAuth";
import { getTransientSession, isSuperadmin2faValid } from "../session.server";

function forbidden(message: string): never {
  throw new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

// -----------------------------------------------------------------------------
// Admin (admin OU superadmin)
// -----------------------------------------------------------------------------
export const requirePlatformAdmin = createMiddleware({ type: "function" })
  .middleware([requireAuth])
  .server(async ({ next, context }) => {
    const { userId } = context;
    // On utilise supabaseAdmin pour bypasser les RLS de user_roles : la
    // vérification d'autorisation ne doit pas dépendre de ses propres policies.
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "superadmin"]);

    if (error) forbidden("Role check failed");
    if (!data || data.length === 0) forbidden("Platform admin role required");

    const isSuperadmin = data.some((r) => r.role === "superadmin");
    return next({
      context: {
        isPlatformAdmin: true as const,
        isPlatformSuperadmin: isSuperadmin,
      },
    });
  });

// -----------------------------------------------------------------------------
// Superadmin (superadmin SEUL + 2FA récente)
// -----------------------------------------------------------------------------
export const requirePlatformSuperadmin = createMiddleware({ type: "function" })
  .middleware([requireAuth])
  .server(async ({ next, context }) => {
    const { userId } = context;
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .maybeSingle();

    if (error) forbidden("Role check failed");
    if (!data) forbidden("Superadmin role required");

    // 2FA récente OBLIGATOIRE pour toute action superadmin.
    // Le cookie maison atteste de la dernière validation TOTP (< 12h).
    let tfaValid = false;
    try {
      const session = await getTransientSession();
      tfaValid = isSuperadmin2faValid(session.data, userId);
    } catch {
      tfaValid = false;
    }
    if (!tfaValid) {
      throw new Response(
        JSON.stringify({
          error: "Superadmin 2FA required",
          code: "SUPERADMIN_2FA_REQUIRED",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    return next({
      context: {
        isPlatformSuperadmin: true as const,
      },
    });
  });
