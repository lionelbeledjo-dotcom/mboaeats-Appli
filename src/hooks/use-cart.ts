import { useCallback } from "react";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import { playCartSound } from "@/lib/cart-sound";

export type { CartItem };

export function addToCart(item: CartItem) {
  useCartStore.getState().add(item);
  playCartSound("add");
}

export function removeFromCart(id: string) {
  useCartStore.getState().remove(id);
  playCartSound("remove");
}

export function setQty(id: string, qty: number) {
  const prev = useCartStore.getState().items.find((i) => i.id === id)?.qty ?? 0;
  useCartStore.getState().setQty(id, qty);
  if (qty > prev) playCartSound("add");
  else playCartSound("remove");
}

export function setItemNote(id: string, note: string) {
  useCartStore.getState().setNote(id, note);
}

export function getCartItems(): CartItem[] {
  return useCartStore.getState().items;
}

export function restoreCartItems(items: CartItem[]) {
  useCartStore.getState().restore(items);
  playCartSound("add");
}

export function clearCart() {
  useCartStore.getState().clear();
}

export function useCart() {
  const items = useCartStore((s) => s.items);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return {
    items,
    subtotal,
    count,
    add: useCallback((it: CartItem) => addToCart(it), []),
    remove: useCallback((id: string) => removeFromCart(id), []),
    setQty: useCallback((id: string, qty: number) => setQty(id, qty), []),
    clear: useCallback(() => clearCart(), []),
  };
}
