import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Vérifie côté serveur que l'utilisateur courant possède bien le rôle admin.
 * À appeler dans `beforeLoad` des routes /admin/** pour bloquer tout accès non autorisé.
 * Lance une erreur si l'utilisateur n'est pas admin.
 */
export const verifyAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("forbidden");
    return { ok: true as const, userId };
  });
