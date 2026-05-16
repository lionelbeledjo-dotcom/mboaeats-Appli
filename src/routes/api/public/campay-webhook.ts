/**
 * MboaEats — Webhook Campay durci
 *
 * CORRECTIONS DE SÉCURITÉ vs ancien webhook (audit C4) :
 *
 *   1. FAIL-CLOSED si CAMPAY_WEBHOOK_KEY absent : on retourne 503 plutôt
 *      que d'accepter en aveugle.
 *   2. Signature lue UNIQUEMENT depuis l'header `x-campay-signature` (jamais
 *      depuis le body — l'attaquant contrôlait la valeur).
 *   3. Comparaison constant-time via `crypto.timingSafeEqual`.
 *   4. Validation Zod du payload.
 *   5. Vérification que `payments.amount_fcfa === orders.total` avant de
 *      marquer une commande comme payée — empêche le rattachement d'un
 *      petit paiement à une grosse commande.
 *   6. Idempotence : la table `payment_webhook_events` empêche de rejouer
 *      le même webhook (effets de bord exécutés une seule fois).
 *   7. Stockage : on garde le payload, mais limité en taille (truncate
 *      large blobs pour éviter l'explosion DB).
 */

import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WEBHOOK_BODY_MAX_BYTES = 32_000; // 32KB — déjà énorme pour un webhook

const PayloadSchema = z.object({
  external_reference: z.string().min(6).max(120).optional(),
  external_user: z.string().min(6).max(120).optional(),
  reference: z.string().min(6).max(120).optional(),
  transaction_id: z.string().min(6).max(120).optional(),
  status: z.string().min(1).max(40),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().max(10).optional(),
});

function constantTimeEqual(a: string, b: string): boolean {
  // Even-length defense : pad both to same length avant compare
  if (a.length !== b.length) {
    // On compare quand même un buffer pour ne pas court-circuiter en timing.
    const ab = Buffer.from(a);
    const bb = Buffer.from(b.padEnd(a.length, "\0").slice(0, a.length));
    timingSafeEqual(ab, bb);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const Route = createFileRoute("/api/public/campay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // -------------------------------------------------------------
        // 1. Fail-closed si la clé n'est pas configurée
        // -------------------------------------------------------------
        const expected = process.env.CAMPAY_WEBHOOK_KEY;
        if (!expected) {
          console.error("[campay-webhook] CAMPAY_WEBHOOK_KEY non configurée");
          return new Response("Webhook not configured", { status: 503 });
        }

        // -------------------------------------------------------------
        // 2. Signature lue UNIQUEMENT depuis header
        // -------------------------------------------------------------
        const signature = request.headers.get("x-campay-signature");
        if (!signature || !constantTimeEqual(signature, expected)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // -------------------------------------------------------------
        // 3. Lecture body avec borne de taille
        // -------------------------------------------------------------
        const rawText = await request.text();
        if (rawText.length > WEBHOOK_BODY_MAX_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(rawText);
        } catch {
          // Fallback form-encoded
          const params = new URLSearchParams(rawText);
          payload = Object.fromEntries(params.entries());
        }

        // -------------------------------------------------------------
        // 4. Validation schéma
        // -------------------------------------------------------------
        const parsed = PayloadSchema.safeParse(payload);
        if (!parsed.success) {
          console.warn("[campay-webhook] payload invalide", parsed.error.message);
          return new Response("Invalid payload", { status: 400 });
        }

        const externalRef =
          parsed.data.external_reference ?? parsed.data.external_user;
        if (!externalRef) {
          return new Response("Missing reference", { status: 400 });
        }

        const status = parsed.data.status.toUpperCase();
        const providerTxId = parsed.data.reference ?? parsed.data.transaction_id ?? null;

        const newStatus =
          status === "SUCCESSFUL"
            ? "succeeded"
            : status === "FAILED"
              ? "failed"
              : "pending";

        // -------------------------------------------------------------
        // 5. Idempotence : enregistrer le webhook AVANT toute action.
        // L'unique index (provider, external_ref, provider_tx_id, status)
        // empêche le rejeu.
        // -------------------------------------------------------------
        const { data: webhookRow, error: whInsErr } = await supabaseAdmin
          .from("payment_webhook_events")
          .insert({
            provider: "campay",
            external_ref: externalRef,
            provider_tx_id: providerTxId,
            status: newStatus,
            payload: parsed.data,
          })
          .select("id, applied")
          .single();

        if (whInsErr) {
          // Si c'est une violation d'unique = on a déjà traité ce webhook → OK
          if (whInsErr.code === "23505") {
            return new Response("Already processed", { status: 200 });
          }
          console.error("[campay-webhook] insert event failed", whInsErr.message);
          return new Response("Internal", { status: 500 });
        }
        if (webhookRow?.applied) {
          return new Response("Already applied", { status: 200 });
        }

        // -------------------------------------------------------------
        // 6. Charger le paiement existant et vérifier le montant
        // -------------------------------------------------------------
        const { data: existingPay } = await supabaseAdmin
          .from("payments")
          .select("status, amount_fcfa, metadata, user_id, purpose")
          .eq("reference", externalRef)
          .maybeSingle();

        if (!existingPay) {
          // Webhook orphelin : on log mais on accuse réception pour ne pas
          // que Campay le rejoue indéfiniment.
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ applied: true, applied_at: new Date().toISOString() })
            .eq("id", webhookRow.id);
          console.warn(
            "[campay-webhook] payment introuvable pour reference",
            externalRef,
          );
          return new Response("OK (orphan)", { status: 200 });
        }

        const prevMeta = (existingPay.metadata as Record<string, unknown> | null) ?? {};
        const orderId = (prevMeta.order_id as string | undefined) ?? null;

        // -------------------------------------------------------------
        // 7. Update payments
        // -------------------------------------------------------------
        const { error: upErr } = await supabaseAdmin
          .from("payments")
          .update({
            status: newStatus,
            provider_tx_id: providerTxId,
            // On garde le payload mais on tronque
            metadata: {
              ...prevMeta,
              webhook_status: newStatus,
              webhook_at: new Date().toISOString(),
              webhook_payload_truncated:
                rawText.slice(0, 4000),
            } as never,
          })
          .eq("reference", externalRef);
        if (upErr) {
          console.error("[campay-webhook] update payment failed", upErr.message);
          return new Response("Internal", { status: 500 });
        }

        // -------------------------------------------------------------
        // 8. Effet de bord ORDER : passer la commande à paid
        // VÉRIFIE LE MONTANT (audit C4) — protège contre l'amount tampering.
        // -------------------------------------------------------------
        if (newStatus === "succeeded" && orderId) {
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, total, status, user_id")
            .eq("id", orderId)
            .maybeSingle();

          if (order && order.user_id === existingPay.user_id) {
            if (existingPay.amount_fcfa === order.total) {
              if (order.status !== "paid" && order.status !== "delivered") {
                await supabaseAdmin
                  .from("orders")
                  .update({
                    status: "paid",
                    paid_at: new Date().toISOString(),
                  })
                  .eq("id", orderId)
                  .neq("status", "paid");
                await supabaseAdmin.from("order_events").insert({
                  order_id: orderId,
                  event_type: "paid",
                  payload: {
                    reference: externalRef,
                    source: "campay_webhook",
                    provider_tx_id: providerTxId,
                  },
                });
              }
            } else {
              console.error(
                "[campay-webhook] AMOUNT MISMATCH",
                "payment=", existingPay.amount_fcfa,
                "order.total=", order.total,
                "ref=", externalRef,
              );
              // On ne passe PAS la commande à paid. On marque le webhook
              // appliqué quand même pour ne pas qu'il soit rejoué.
            }
          }
        }

        // -------------------------------------------------------------
        // 9. Mark applied
        // -------------------------------------------------------------
        await supabaseAdmin
          .from("payment_webhook_events")
          .update({ applied: true, applied_at: new Date().toISOString() })
          .eq("id", webhookRow.id);

        return new Response("OK", { status: 200 });
      },
    },
  },
});
