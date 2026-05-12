import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ───────────────────────────────────────────────────────────────────────────
// Reçus de paiement — SMS via Twilio (+237 uniquement) + email via Resend
// ───────────────────────────────────────────────────────────────────────────

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

function normalizeCmPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "").replace(/^0+/, "");
  const e164 = digits.startsWith("237") ? `+${digits}` : `+237${digits}`;
  // Format Cameroun : +237 6XXXXXXXX (9 chiffres après 237)
  if (!/^\+2376\d{8}$/.test(e164)) return null;
  return e164;
}

function fmtFcfa(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

async function sendSms(to: string, body: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!lovableKey || !twilioKey || !from) {
    return { ok: false, skipped: true, reason: "twilio_not_configured" as const };
  }
  const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, error: `Twilio ${res.status}: ${t.slice(0, 200)}` };
  }
  return { ok: true as const };
}

async function sendEmail(to: string, subject: string, html: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    return { ok: false, skipped: true, reason: "resend_not_configured" as const };
  }
  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MboaEats <commandes@mboaeat.site>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` };
  }
  return { ok: true as const };
}

const ReceiptSchema = z.object({
  order_id: z.string().uuid(),
});

export const sendOrderReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReceiptSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Récupère commande + items + restaurant + profil utilisateur
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, total, subtotal, delivery_fee, promo_discount, payment_method, status, restaurant_id, user_id, created_at")
      .eq("id", data.order_id)
      .maybeSingle();

    if (!order || order.user_id !== userId) {
      throw new Error("Commande introuvable");
    }

    const [{ data: items }, { data: resto }, { data: profile }, { data: userRes }] = await Promise.all([
      supabaseAdmin.from("order_items").select("name, qty, unit_price, line_total").eq("order_id", order.id),
      supabaseAdmin.from("restaurants").select("name").eq("id", order.restaurant_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("phone, full_name").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    const restoName = resto?.name ?? "Restaurant";
    const lines = (items ?? [])
      .map((i) => `${i.qty}× ${i.name}  ${fmtFcfa(i.line_total)}`)
      .join("\n");

    const methodLabel: Record<string, string> = {
      momo: "MTN Mobile Money",
      orange: "Orange Money",
      card: "Carte bancaire",
      cash: "Cash à la livraison",
      wallet: "Wallet MboaEats",
    };
    const method = methodLabel[order.payment_method ?? ""] ?? "—";

    const smsBody =
      `MboaEats — Reçu ${order.reference}\n` +
      `${restoName}\n` +
      `Total: ${fmtFcfa(order.total)}\n` +
      `Paiement: ${method}\n` +
      `Suivi: https://mboaeat.site/suivi/${order.id}`;

    const phone = normalizeCmPhone(profile?.phone);
    const email = userRes?.user?.email ?? null;

    const results: Record<string, unknown> = {};

    if (phone) {
      results.sms = await sendSms(phone, smsBody);
    } else {
      results.sms = { ok: false, skipped: true, reason: "no_cm_phone" };
    }

    if (email) {
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#111">
          <h1 style="font-size:20px;margin:0 0 4px">Reçu de commande</h1>
          <p style="color:#666;margin:0 0 24px">Référence : <strong>${order.reference}</strong></p>
          <div style="background:#F8F8F8;border-radius:12px;padding:16px;margin-bottom:16px">
            <p style="margin:0 0 8px;font-weight:bold">${restoName}</p>
            <pre style="white-space:pre-wrap;font-family:inherit;margin:0;font-size:14px;color:#333">${lines}</pre>
          </div>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td>Sous-total</td><td style="text-align:right">${fmtFcfa(order.subtotal)}</td></tr>
            <tr><td>Livraison</td><td style="text-align:right">${fmtFcfa(order.delivery_fee)}</td></tr>
            ${order.promo_discount ? `<tr><td>Remise</td><td style="text-align:right;color:#06C167">−${fmtFcfa(order.promo_discount)}</td></tr>` : ""}
            <tr style="font-weight:bold;font-size:16px;border-top:1px solid #eee">
              <td style="padding-top:8px">Total</td><td style="text-align:right;padding-top:8px">${fmtFcfa(order.total)}</td>
            </tr>
            <tr><td>Paiement</td><td style="text-align:right;color:#666">${method}</td></tr>
          </table>
          <p style="margin-top:24px;color:#666;font-size:13px">Merci d'avoir commandé sur MboaEats 🍽️</p>
        </div>
      `;
      results.email = await sendEmail(email, `Reçu MboaEats — ${order.reference}`, html);
    } else {
      results.email = { ok: false, skipped: true, reason: "no_email" };
    }

    return { ok: true as const, channels: results };
  });
