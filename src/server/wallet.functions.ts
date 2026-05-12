import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ───────────────────────────────────────────────────────────────────────────
// Wallet MboaEats — solde + historique + recharge + paiement + remboursement
// ───────────────────────────────────────────────────────────────────────────

export const walletGetMine = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const { data: w } = await supabase
      .from("wallets")
      .select("balance_fcfa, currency, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: tx } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount_fcfa, balance_after, reference, order_id, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      wallet: w ?? { balance_fcfa: 0, currency: "XAF", updated_at: null },
      transactions: tx ?? [],
    };
  });

// ─── Liste unifiée des paiements (wallet + Mobile Money + cash) ─────────────
export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const [walletRes, paymentsRes, ordersRes] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("id, type, amount_fcfa, reference, order_id, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("payments")
        .select("id, provider, reference, amount_fcfa, status, purpose, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("orders")
        .select("id, reference, total, status, payment_method, created_at, paid_at")
        .eq("user_id", userId)
        .eq("payment_method", "cash")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return {
      wallet: walletRes.data ?? [],
      payments: paymentsRes.data ?? [],
      cashOrders: ordersRes.data ?? [],
    };
  });

// ─── Recharge wallet : démarre un paiement Campay (purpose=wallet_topup) ────
const TopupSchema = z.object({
  provider: z.enum(["momo", "orange"]),
  msisdn: z.string().regex(/^\+?\d{8,15}$/, "Numéro invalide"),
  amount: z.number().int().min(500, "Min 500 FCFA").max(500_000),
});

export const initiateWalletTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TopupSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    if (!process.env.CAMPAY_USERNAME || !process.env.CAMPAY_PASSWORD) {
      throw new Error("Recharge indisponible : Campay n'est pas configuré.");
    }

    const reference = `TOPUP_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      provider: data.provider,
      reference,
      msisdn: data.msisdn,
      amount_fcfa: data.amount,
      purpose: "wallet_topup",
      status: "pending",
      metadata: { live: true, provider_name: "campay", user_id: userId, type: "topup" },
    });
    if (error) throw new Error(error.message);

    // Appel Campay collect (réutilise la logique inlining minimale)
    const tokenRes = await fetch(`${process.env.CAMPAY_BASE_URL || "https://campay.net/api"}/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.CAMPAY_USERNAME,
        password: process.env.CAMPAY_PASSWORD,
      }),
    });
    if (!tokenRes.ok) throw new Error("Campay token failed");
    const { token } = (await tokenRes.json()) as { token: string };

    const phone = data.msisdn.replace(/\D/g, "").replace(/^0+/, "");
    const fullPhone = phone.startsWith("237") ? phone : `237${phone}`;

    const collectRes = await fetch(
      `${process.env.CAMPAY_BASE_URL || "https://campay.net/api"}/collect/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({
          amount: String(data.amount),
          currency: "XAF",
          from: fullPhone,
          description: `MboaEats Wallet ${reference}`,
          external_reference: reference,
        }),
      },
    );
    const j = (await collectRes.json().catch(() => ({}))) as { reference?: string; ussd_code?: string };
    if (!collectRes.ok || !j.reference) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("reference", reference);
      throw new Error("Échec d'initialisation de la recharge");
    }
    await supabaseAdmin
      .from("payments")
      .update({ provider_tx_id: j.reference, status: "pending" })
      .eq("reference", reference);

    return { ok: true as const, reference, ussd: j.ussd_code };
  });

// ─── Paiement d'une commande avec le wallet (atomique) ──────────────────────
const PayWithWalletSchema = z.object({
  order_id: z.string().uuid(),
});

export const payOrderWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PayWithWalletSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    const { data: order, error: oerr } = await supabase
      .from("orders")
      .select("id, user_id, total, status, reference")
      .eq("id", data.order_id)
      .maybeSingle();
    if (oerr) throw new Error(oerr.message);
    if (!order || order.user_id !== userId) throw new Error("Commande introuvable");
    if (order.status !== "pending_payment" && order.status !== "draft") {
      throw new Error(`Commande déjà traitée (${order.status})`);
    }

    // Débit atomique
    const { data: applied, error: werr } = await supabaseAdmin.rpc("wallet_apply", {
      _user_id: userId,
      _delta: -order.total,
      _type: "order_payment",
      _description: `Paiement commande ${order.reference}`,
      _reference: order.reference,
      _order_id: order.id,
      _payment_id: null,
    });
    if (werr) {
      if (werr.message.includes("insufficient_funds")) {
        throw new Error("Solde insuffisant — rechargez votre wallet");
      }
      throw new Error(werr.message);
    }

    await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: "wallet",
      })
      .eq("id", order.id);

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      event_type: "paid",
      payload: { method: "wallet", reference: order.reference },
      created_by: userId,
    });

    const newBalance = Array.isArray(applied) && applied[0]?.new_balance;
    return { ok: true as const, new_balance: newBalance ?? 0 };
  });

// ─── Paiement cash : marque la commande comme à régler à la livraison ───────
const CashSchema = z.object({ order_id: z.string().uuid() });

export const confirmCashOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CashSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, status, reference")
      .eq("id", data.order_id)
      .maybeSingle();
    if (!order || order.user_id !== userId) throw new Error("Commande introuvable");
    if (order.status !== "pending_payment" && order.status !== "draft") {
      throw new Error("Commande déjà confirmée");
    }
    await supabaseAdmin
      .from("orders")
      .update({ status: "accepted", payment_method: "cash", accepted_at: new Date().toISOString() })
      .eq("id", order.id);
    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      event_type: "cash_confirmed",
      payload: { method: "cash" },
      created_by: userId,
    });
    return { ok: true as const, reference: order.reference };
  });

// ─── Remboursement automatique sous 5 min ───────────────────────────────────
const RefundSchema = z.object({ order_id: z.string().uuid() });

export const requestRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RefundSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Appel direct via supabase (RLS) — la fonction SQL vérifie auth.uid() et la fenêtre 5 min
    const { data: result, error } = await supabase.rpc("refund_order_to_wallet", {
      _order_id: data.order_id,
    });
    if (error) {
      const msg = error.message;
      if (msg.includes("refund_window_expired"))
        throw new Error("Délai de 5 minutes dépassé — contactez le support.");
      if (msg.includes("order_not_refundable"))
        throw new Error("Cette commande ne peut pas être remboursée automatiquement.");
      if (msg.includes("order_already_cancelled"))
        throw new Error("Commande déjà annulée.");
      if (msg.includes("forbidden")) throw new Error("Action non autorisée.");
      throw new Error(msg);
    }
    const row = Array.isArray(result) ? result[0] : result;
    return {
      ok: true as const,
      refunded: row?.refunded_amount ?? 0,
      new_balance: row?.new_balance ?? 0,
    };
  });
