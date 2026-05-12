import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TIERS = [
  { name: "Pistache", from: 0 },
  { name: "Soya Boy", from: 800 },
  { name: "Chef Ndolé", from: 2500 },
  { name: "Roi du Mboa", from: 6000 },
];

function tierFor(pts: number) {
  let cur = TIERS[0];
  let next = TIERS[1];
  for (let i = 0; i < TIERS.length; i++) {
    if (pts >= TIERS[i].from) {
      cur = TIERS[i];
      next = TIERS[i + 1] ?? TIERS[i];
    }
  }
  return { cur, next };
}

export const getMyReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data: code } = await supabase.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    if (!code) {
      const generated = "MBOA-" + userId.replace(/-/g, "").slice(0, 6).toUpperCase();
      await supabase.from("referral_codes").insert({ user_id: userId, code: generated });
      code = { code: generated };
    }
    const { data: refs } = await supabase
      .from("referrals")
      .select("id, status, bonus_amount, rewarded_at, created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });
    const list = refs ?? [];
    const totalEarned = list.filter((r) => r.status === "rewarded").reduce((s, r) => s + (r.bonus_amount ?? 0), 0);
    const { data: incoming } = await supabase
      .from("referrals")
      .select("status, code")
      .eq("referred_user_id", userId)
      .maybeSingle();
    return {
      code: code.code,
      shareUrl: `https://mboaeat.site/inscription?ref=${code.code}`,
      referrals: list,
      totalEarned,
      pendingCount: list.filter((r) => r.status === "pending").length,
      rewardedCount: list.filter((r) => r.status === "rewarded").length,
      myReferrer: incoming ?? null,
    };
  });

export const applyMyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(4).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("apply_referral_code", { _code: data.code.toUpperCase() });
    if (error) throw new Error(error.message);
    return { code: result };
  });

export const getMyRewardsCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [catalogRes, lpRes, redemRes] = await Promise.all([
      supabase.from("rewards_catalog").select("*").eq("is_active", true).order("cost_points"),
      supabase.from("loyalty_points").select("points, level").eq("user_id", userId).maybeSingle(),
      supabase.from("reward_redemptions").select("id, reward_code, cost_points, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);
    const points = lpRes.data?.points ?? 0;
    const t = tierFor(points);
    return {
      catalog: catalogRes.data ?? [],
      points,
      tier: t.cur.name,
      nextTier: t.next.name,
      nextThreshold: t.next.from,
      pct: t.next.from > t.cur.from ? Math.min(100, Math.round(((points - t.cur.from) / (t.next.from - t.cur.from)) * 100)) : 100,
      history: redemRes.data ?? [],
    };
  });

export const redeemMyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ rewardCode: z.string().min(2).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("redeem_reward", { _reward_code: data.rewardCode });
    if (error) throw new Error(error.message);
    return result as { reward: string; cost: number; new_balance: number };
  });
