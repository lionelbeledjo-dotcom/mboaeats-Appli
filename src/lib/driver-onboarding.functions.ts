import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyDriverProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("driver_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

const ApplicationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  city: z.string().trim().min(2).max(80).optional().nullable(),
  vehicle_type: z.string().trim().min(2).max(40).optional().nullable(),
  plate_number: z.string().trim().min(1).max(20),
  photo_url: z.string().trim().min(1).max(500),
  cni_url: z.string().trim().min(1).max(500),
  permis_url: z.string().trim().max(500).optional().nullable(),
});

export const submitDriverApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ApplicationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      ...data,
      status: "en_attente" as const,
      rejection_reason: null,
      validated_at: null,
      validated_by: null,
    };
    const { data: row, error } = await supabase
      .from("driver_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { profile: row };
  });

// ----- Admin -----

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "superadmin"] as never);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden");
}

export const listDriverApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ status: z.enum(["en_attente", "valide", "rejete"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("driver_profiles").select("*").order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { applications: rows ?? [] };
  });

export const approveDriverApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("driver_profiles")
      .update({ status: "valide", validated_by: context.userId, rejection_reason: null })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    // Grant 'livreur' role so the user can access /livreur after approval.
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: "livreur" as never }, { onConflict: "user_id,role" });
    // Email — awaited inline.
    try {
      const { sendEmail, getUserEmail } = await import("@/server/email.functions");
      const email = await getUserEmail(data.user_id);
      if (email) {
        const { data: prof } = await supabaseAdmin
          .from("driver_profiles").select("full_name").eq("user_id", data.user_id).maybeSingle();
        await sendEmail({
          to: email, template: "driver_approved",
          related_id: data.user_id, user_id: data.user_id,
          data: { full_name: (prof as any)?.full_name },
        });
      }
    } catch (e) { console.error("[approveDriverApplication email] failed", e); }
    return { ok: true };
  });

export const rejectDriverApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), reason: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("driver_profiles")
      .update({ status: "rejete", rejection_reason: data.reason ?? null, validated_by: context.userId })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    // Remove livreur role if previously granted
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "livreur" as never);
    // Email
    void (async () => {
      try {
        const { sendEmail, getUserEmail } = await import("@/server/email.functions");
        const email = await getUserEmail(data.user_id);
        if (!email) return;
        const { data: prof } = await supabaseAdmin
          .from("driver_profiles").select("full_name").eq("user_id", data.user_id).maybeSingle();
        await sendEmail({
          to: email, template: "driver_rejected",
          related_id: `${data.user_id}-rejected`, user_id: data.user_id,
          data: { full_name: (prof as any)?.full_name, reason: data.reason },
        });
      } catch (e) { console.error("[rejectDriverApplication email] failed", e); }
    })();
    return { ok: true };
  });
