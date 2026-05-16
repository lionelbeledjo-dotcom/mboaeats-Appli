/**
 * MboaEats — Promotion admin (refondu)
 *
 * CORRECTIONS DE SÉCURITÉ vs ancien fichier :
 *
 *   C6 [CRITIQUE] SUPPRESSION COMPLÈTE de l'allowlist `ADMIN_PHONE_ALLOWLIST`.
 *     Un attaquant qui interceptait un SMS sur ce numéro devenait admin.
 *
 *   Bootstrap unique : seule la première session sur une base sans admin
 *     peut s'auto-promouvoir, via la fonction SQL `claim_super_admin()`
 *     existante. Toute promotion ultérieure passe par
 *     `promoteToPlatformAdmin` (requiert `requirePlatformSuperadmin`).
 *
 *   Audit : chaque promotion/rétrogradation passe par les triggers
 *     `tg_audit_row` du Lot A (table audit_logs).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middlewares/requireAuth";
import { requirePlatformSuperadmin } from "@/auth/middlewares/requirePlatformAdmin";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// -----------------------------------------------------------------------------
// claimSuperAdmin — bootstrap unique sur DB vierge
// -----------------------------------------------------------------------------
// Délégué à la fonction SQL `claim_super_admin()` qui :
//   - vérifie qu'il n'y a AUCUN admin existant
//   - insère le user courant comme admin
//   - retourne false si la fenêtre de bootstrap est déjà fermée
//
// Après usage, le superadmin doit IMMÉDIATEMENT :
//   1. Configurer sa 2FA (`/superadmin/setup-2fa`)
//   2. Faire DROP de la fonction `claim_super_admin()` via migration
//      `999_remove_bootstrap.sql`
// -----------------------------------------------------------------------------
export const claimSuperAdminBootstrap = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("claim_super_admin");
    if (error) throw new Error(error.message);
    return { ok: data === true };
  });

// -----------------------------------------------------------------------------
// promoteToPlatformAdmin — superadmin + 2FA récente
// -----------------------------------------------------------------------------
export const promoteToPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requirePlatformSuperadmin])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["admin", "livreur"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: data.user_id, role: data.role },
      { onConflict: "user_id,role" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -----------------------------------------------------------------------------
// revokePlatformRole — superadmin + 2FA récente
// -----------------------------------------------------------------------------
export const revokePlatformRole = createServerFn({ method: "POST" })
  .middleware([requirePlatformSuperadmin])
  .inputValidator((d) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["admin", "livreur", "superadmin"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Garde-fou : un superadmin ne peut pas se révoquer lui-même
    // (sinon plus aucun superadmin = perte de contrôle).
    if (data.role === "superadmin" && data.user_id === context.userId) {
      throw new Error("Vous ne pouvez pas vous révoquer vous-même comme superadmin");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -----------------------------------------------------------------------------
// checkAdminEligibility — version saine (juste status, plus de phone-check)
// -----------------------------------------------------------------------------
export const checkAdminEligibility = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "superadmin"]);
    return {
      isAdmin: (data ?? []).some((r) => r.role === "admin"),
      isSuperadmin: (data ?? []).some((r) => r.role === "superadmin"),
    };
  });
