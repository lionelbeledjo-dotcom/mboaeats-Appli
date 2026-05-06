import { useCallback, useSyncExternalStore } from "react";

export type CartItem = {
  id: string; // unique key (dish id + options hash)
  dishId: string;
  restoId: string;
  name: string;
  price: number; // unit price including options
  qty: number;
  image?: string;
  options?: Record<string, string>;
};

const KEY = "mboa_cart_v1";
const EVT = "mboa_cart_changed";

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function addToCart(item: CartItem) {
  const items = read();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx].qty += item.qty;
  else items.push(item);
  write(items);
}

export function removeFromCart(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearCart() {
  write([]);
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

let cache: CartItem[] = [];
let cacheKey = "";
function getSnapshot(): CartItem[] {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) ?? "" : "";
  if (raw !== cacheKey) {
    cacheKey = raw;
    cache = read();
  }
  return cache;
}
const emptySnap: CartItem[] = [];
function getServerSnapshot(): CartItem[] {
  return emptySnap;
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const subtotal = items.reduce((s: number, i: CartItem) => s + i.qty * i.price, 0);
  const count = items.reduce((s: number, i: CartItem) => s + i.qty, 0);

  return {
    items,
    subtotal,
    count,
    add: useCallback((it: CartItem) => addToCart(it), []),
    remove: useCallback((id: string) => removeFromCart(id), []),
    clear: useCallback(() => clearCart(), []),
  };
}

