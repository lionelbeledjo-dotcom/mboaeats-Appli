import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";


export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value_int, value_text, description, updated_at")
      .order("key");
    if (error) throw new Error(error.message);

    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin");

    const ids = (admins ?? []).map((a) => a.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("user_id, full_name, phone, city").in("user_id", ids)
      : { data: [] as any[] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const adminList = (admins ?? []).map((a: any) => ({
      user_id: a.user_id,
      created_at: a.created_at,
      profile: pMap.get(a.user_id) ?? null,
    }));

    return { settings: data ?? [], admins: adminList };
  });

export const upsertPlatformSetting = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z
      .object({
        key: z.string().min(1).max(80),
        value_int: z.number().int().nullable().optional(),
        value_text: z.string().max(500).nullable().optional(),
        description: z.string().max(500).nullable().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .upsert(
        {
          key: data.key,
          value_int: data.value_int ?? null,
          value_text: data.value_text ?? null,
          description: data.description ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlatformSetting = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ key: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("platform_settings").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
