type FeatureFlag =
  | "ENABLE_GROUP_ORDERS"
  | "ENABLE_LOYALTY_POINTS"
  | "ENABLE_PUSH_NOTIFICATIONS"
  | "ENABLE_REALTIME_TRACKING"
  | "ENABLE_RESTAURANT_REVIEWS"
  | "ENABLE_DARK_MODE";

const FLAGS: Record<FeatureFlag, boolean> = {
  ENABLE_GROUP_ORDERS: env("VITE_FF_GROUP_ORDERS", true),
  ENABLE_LOYALTY_POINTS: env("VITE_FF_LOYALTY_POINTS", true),
  ENABLE_PUSH_NOTIFICATIONS: env("VITE_FF_PUSH_NOTIFICATIONS", true),
  ENABLE_REALTIME_TRACKING: env("VITE_FF_REALTIME_TRACKING", true),
  ENABLE_RESTAURANT_REVIEWS: env("VITE_FF_RESTAURANT_REVIEWS", true),
  ENABLE_DARK_MODE: env("VITE_FF_DARK_MODE", false),
};

function env(key: string, fallback: boolean): boolean {
  if (typeof import.meta === "undefined") return fallback;
  const val = (import.meta as any).env?.[key];
  if (val === undefined || val === "") return fallback;
  return val === "true" || val === "1";
}

export function isEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag] ?? false;
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isEnabled(flag);
}
