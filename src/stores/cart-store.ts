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
        const items = [...get().items];
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
        else items.push(item);
        set({ items });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQty: (id, qty) => {
        if (qty <= 0) return set({ items: get().items.filter((i) => i.id !== id) });
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, qty } : i)),
        });
      },
      setNote: (id, note) =>
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, note } : i)),
        }),
      clear: () => set({ items: [] }),
      restore: (items) => set({ items }),
    }),
    {
      name: "mboa_cart_v3",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
