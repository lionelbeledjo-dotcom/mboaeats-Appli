import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Campay webhook — appelé après confirmation/refus d'un paiement.
// Configurez l'URL dans le dashboard Campay :
//   https://mboaeat.site/api/public/campay-webhook
// Et la clé secrète dans CAMPAY_WEBHOOK_KEY (transmise en `signature`).

export const Route = createFileRoute("/api/public/campay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(body); } catch { /* form-encoded fallback */
          const params = new URLSearchParams(body);
          payload = Object.fromEntries(params.entries());
        }

        const expected = process.env.CAMPAY_WEBHOOK_KEY;
        const signature = (payload.signature as string) || request.headers.get("x-campay-signature");
        if (expected && signature !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }

        const externalRef = (payload.external_reference as string) || (payload.external_user as string);
        const status = String(payload.status || "").toUpperCase();
        const providerTxId = (payload.reference as string) || (payload.transaction_id as string);

        if (!externalRef) return new Response("Missing reference", { status: 400 });

        const newStatus = status === "SUCCESSFUL" ? "succeeded" : status === "FAILED" ? "failed" : "pending";

        // Récupérer la metadata existante (contient potentiellement order_id)
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("metadata, status")
          .eq("reference", externalRef)
          .maybeSingle();
        const prevMeta = (existing?.metadata as Record<string, unknown> | null) ?? {};
        const orderId = (prevMeta.order_id as string | undefined) ?? null;

        const { error } = await supabaseAdmin
          .from("payments")
          .update({
            status: newStatus,
            provider_tx_id: providerTxId ?? null,
            metadata: { ...prevMeta, webhook: payload } as never,
          })
          .eq("reference", externalRef);
        if (error) return new Response(error.message, { status: 500 });

        // Si succès et qu'on a une commande liée → marquer payée + journaliser
        if (newStatus === "succeeded" && orderId && existing?.status !== "succeeded") {
          await supabaseAdmin
            .from("orders")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", orderId)
            .neq("status", "paid");
          await supabaseAdmin.from("order_events").insert({
            order_id: orderId,
            event_type: "paid",
            payload: { reference: externalRef, source: "campay_webhook", provider_tx_id: providerTxId },
          });
        }

        return new Response("ok");
      },
    },
  },
});
