import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItemExtra = { name: string; price: number };

export type CartItem = {
  id: string;
  dishId: string;
  restoId: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  options?: Record<string, string>;
  extras?: CartItemExtra[];
  note?: string;
};

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<CartItem> => !!item && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dishId: typeof item.dishId === "string" ? item.dishId : "",
      restoId: typeof item.restoId === "string" ? item.restoId : "",
      name: typeof item.name === "string" && item.name ? item.name : "Article",
      price: Number.isFinite(item.price) ? Number(item.price) : 0,
      qty: Math.max(1, Number.isFinite(item.qty) ? Number(item.qty) : 1),
      image: typeof item.image === "string" ? item.image : undefined,
      options: item.options && typeof item.options === "object" ? item.options : undefined,
      extras: Array.isArray(item.extras) ? item.extras : undefined,
      note: typeof item.note === "string" ? item.note : undefined,
    }))
    .filter((item) => item.id && item.name && item.qty > 0);
}

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  setNote: (id: string, note: string) => void;
  clear: () => void;
  restore: (items: CartItem[]) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const items = normalizeCartItems(get().items);
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
        else items.push(item);
        set({ items });
      },
      remove: (id) => set({ items: normalizeCartItems(get().items).filter((i) => i.id !== id) }),
      setQty: (id, qty) => {
        const items = normalizeCartItems(get().items);
        if (qty <= 0) return set({ items: items.filter((i) => i.id !== id) });
        set({
          items: items.map((i) => (i.id === id ? { ...i, qty } : i)),
        });
      },
      setNote: (id, note) =>
        set({
          items: normalizeCartItems(get().items).map((i) => (i.id === id ? { ...i, note } : i)),
        }),
      clear: () => set({ items: [] }),
      restore: (items) => set({ items: normalizeCartItems(items) }),
    }),
    {
      name: "mboa_cart_v3",
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => ({
        ...(persisted && typeof persisted === "object" ? persisted : {}),
        items: normalizeCartItems((persisted as Partial<CartState> | undefined)?.items),
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted && typeof persisted === "object" ? persisted : {}),
        items: normalizeCartItems((persisted as Partial<CartState> | undefined)?.items),
      }),
    },
  ),
);
