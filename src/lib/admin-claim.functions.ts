import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Numéros autorisés à s'auto-promouvoir admin (format E.164, sans espaces).
const ADMIN_PHONE_ALLOWLIST = ["+33660061723", "33660061723"];

function normalize(p: string | null | undefined) {
  if (!p) return "";
  return p.replace(/\s|-/g, "");
}

export const claimAdminByPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const phone = normalize((claims as any)?.phone ?? "");
    const withPlus = phone.startsWith("+") ? phone : `+${phone}`;

    const allowed = ADMIN_PHONE_ALLOWLIST.some(
      (p) => normalize(p) === phone || normalize(p) === withPlus
    );
    if (!allowed) {
      throw new Error("Ce numéro n'est pas autorisé à devenir administrateur.");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

export const checkAdminEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims, supabase } = context;
    const phone = normalize((claims as any)?.phone ?? "");
    const withPlus = phone.startsWith("+") ? phone : `+${phone}`;
    const eligible = ADMIN_PHONE_ALLOWLIST.some(
      (p) => normalize(p) === phone || normalize(p) === withPlus
    );

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    return { eligible, isAdmin: !!data };
  });
