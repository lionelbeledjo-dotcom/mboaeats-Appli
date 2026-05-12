import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Renvoie le contact (prénom + téléphone) du livreur, uniquement au client de la commande. */
export const getDriverContact = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) =>
    z.object({ orderId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("user_id, driver_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Commande introuvable");
    if (order.user_id !== userId) throw new Error("Accès refusé");
    if (!order.driver_id) return { driver: null };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone, avatar_url")
      .eq("user_id", order.driver_id)
      .maybeSingle();

    return {
      driver: profile
        ? {
            id: order.driver_id,
            name: (profile.full_name?.split(" ")[0] ?? "Livreur") || "Livreur",
            phone: profile.phone ?? null,
            avatar_url: profile.avatar_url ?? null,
          }
        : { id: order.driver_id, name: "Livreur", phone: null, avatar_url: null },
    };
  });

/** Crée un signalement (dispute) sur une commande en cours de livraison. */
export const reportOrderIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        reason: z.enum([
          "livreur_introuvable",
          "retard_important",
          "mauvaise_adresse",
          "commande_incomplete",
          "qualite",
          "autre",
        ]),
        description: z.string().min(5).max(800).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, restaurant_id, total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Commande introuvable");

    const { data: row, error } = await supabase
      .from("disputes")
      .insert({
        user_id: userId,
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        amount: order.total ?? 0,
        reason: data.reason,
        description: data.description ?? null,
        status: "open",
        priority: "medium",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });
