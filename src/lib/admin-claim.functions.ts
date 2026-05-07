import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Numéros autorisés à s'auto-promouvoir admin (format E.164, sans espaces).
const ADMIN_PHONE_ALLOWLIST = ["+33660061723", "33660061723"];

function normalize(p: string | null | undefined) {
  if (!p) return "";
  const digits = p.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

async function getVerifiedUserPhone(userId: string, claims: unknown) {
  const claimPhone = normalize((claims as any)?.phone ?? "");
  if (claimPhone) return claimPhone;

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);
  const user = data.user;
  return normalize(user?.phone || (user?.user_metadata as any)?.phone || "");
}

function isAllowedAdminPhone(phone: string) {
  return ADMIN_PHONE_ALLOWLIST.some((p) => normalize(p) === normalize(phone));
}

export const claimAdminByPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const phone = await getVerifiedUserPhone(userId, claims);
    if (!isAllowedAdminPhone(phone)) {
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
    const phone = await getVerifiedUserPhone(userId, claims);
    const eligible = isAllowedAdminPhone(phone);

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    return { eligible, isAdmin: !!data };
  });
