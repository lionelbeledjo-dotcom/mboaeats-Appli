// Helpers déterministes pour enrichir les restaurants mockés avec des
// méta-données catalogue (cuisine, badges, frais livraison, horaires…).
import type { Restaurant } from "@/data/restaurants";

export type CatalogBadge = "new" | "popular" | "promo" | null;

export const CUISINE_KEYS = [
  "africain",
  "burgers",
  "pizzas",
  "poulet",
  "sushi",
  "snacks",
  "boissons",
] as const;
export type CuisineKey = (typeof CUISINE_KEYS)[number];

export const CUISINE_LABEL: Record<CuisineKey, string> = {
  africain: "Africain",
  burgers: "Burgers",
  pizzas: "Pizzas",
  poulet: "Poulet",
  sushi: "Sushi",
  snacks: "Snacks",
  boissons: "Boissons",
};

export const CUISINE_ICON: Record<CuisineKey, string> = {
  africain: "🥘",
  burgers: "🍔",
  pizzas: "🍕",
  poulet: "🍗",
  sushi: "🍣",
  snacks: "🥨",
  boissons: "🥤",
};

const CUISINE_KEYWORDS: Record<CuisineKey, string[]> = {
  burgers: ["burger", "ovalie", "brasserie"],
  pizzas: ["pizza", "italien"],
  poulet: ["poulet", "grill", "braise", "okokut"],
  sushi: ["sushi", "japon"],
  snacks: ["snack", "soya", "suya", "beignet", "brochette"],
  boissons: ["jus", "bissap", "boisson", "cocktail"],
  africain: [], // fallback
};

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function inferCuisine(r: Restaurant): CuisineKey {
  const hay = `${r.name} ${r.tagline} ${r.categories.map((c) => c.label).join(" ")}`.toLowerCase();
  for (const k of CUISINE_KEYS) {
    if (k === "africain") continue;
    if (CUISINE_KEYWORDS[k].some((kw) => hay.includes(kw))) return k;
  }
  return "africain";
}

/** Frais de livraison déterministes : 500 à 1500 FCFA, par tranche de 100. */
export function deliveryFee(r: Restaurant): number {
  return 500 + (hash(r.id) % 11) * 100;
}

/** Distance approximative en km, déterministe (1.0 → 8.5). */
export function distanceKm(r: Restaurant): number {
  return Math.round((1 + (hash(r.id + "d") % 75) / 10) * 10) / 10;
}

export function etaMinAvg(eta: string): number {
  // "20-30 min" → 25, "25 min" → 25
  const nums = eta.match(/\d+/g)?.map(Number) ?? [30];
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round(sum / nums.length);
}

export function isFastDelivery(r: Restaurant): boolean {
  return etaMinAvg(r.eta) < 30;
}

export function hasPromo(r: Restaurant): boolean {
  return hash(r.id + "promo") % 4 === 0; // ~25%
}

export function promoLabel(r: Restaurant): string {
  const variants = ["-15%", "-20%", "Livraison offerte", "1 acheté = 1 offert"];
  return variants[hash(r.id + "label") % variants.length];
}

const NEW_IDS = new Set(["okokut-bonanjo", "wouri-bistro", "mami-nyanga", "bonaberi-grill"]);
export function isNew(r: Restaurant): boolean {
  return NEW_IDS.has(r.id);
}

export function catalogBadge(r: Restaurant): CatalogBadge {
  if (isNew(r)) return "new";
  if (hasPromo(r)) return "promo";
  if (r.rating >= 4.7) return "popular";
  return null;
}

export function badgeMeta(b: CatalogBadge): { label: string; bg: string; fg: string } | null {
  if (!b) return null;
  if (b === "new") return { label: "Nouveau", bg: "#1A1A1A", fg: "#FFFFFF" };
  if (b === "popular") return { label: "Populaire", bg: "#FFE9CC", fg: "#7A4A00" };
  return { label: "Promo", bg: "#06C167", fg: "#FFFFFF" };
}

export type DayKey = "lun" | "mar" | "mer" | "jeu" | "ven" | "sam" | "dim";
export const DAY_LABEL: Record<DayKey, string> = {
  lun: "Lundi",
  mar: "Mardi",
  mer: "Mercredi",
  jeu: "Jeudi",
  ven: "Vendredi",
  sam: "Samedi",
  dim: "Dimanche",
};

export function openingHours(r: Restaurant): Record<DayKey, string> {
  const h = hash(r.id + "open");
  const open = 10 + (h % 3); // 10–12
  const close = 21 + ((h >> 2) % 3); // 21–23
  const fmt = `${open}h00 – ${close}h00`;
  return { lun: fmt, mar: fmt, mer: fmt, jeu: fmt, ven: fmt, sam: fmt, dim: h % 5 === 0 ? "Fermé" : fmt };
}

export function isOpenNow(r: Restaurant, now: Date = new Date()): boolean {
  const days: DayKey[] = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  const today = days[now.getDay()];
  const slot = openingHours(r)[today];
  if (slot === "Fermé") return false;
  const m = slot.match(/(\d+)h\d* – (\d+)h/);
  if (!m) return true;
  const o = Number(m[1]);
  const c = Number(m[2]);
  const cur = now.getHours();
  return cur >= o && cur < c;
}

/** Allergènes déterministes par plat (pour MVP catalogue). */
export function dishAllergens(dishId: string): string[] {
  const pool = [
    ["Arachide"],
    ["Gluten"],
    ["Poisson"],
    ["Crustacés"],
    ["Lait"],
    ["Œufs"],
    [],
  ];
  return pool[hash(dishId) % pool.length];
}

export function reviewCount(r: Restaurant): number {
  return 80 + (hash(r.id + "rev") % 1820);
}
