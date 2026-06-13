import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock zustand persist to be a no-op passthrough
vi.mock("zustand/middleware", () => ({
  persist: (config: any) => config,
  createJSONStorage: () => ({}),
}));

import { useCartStore, type CartItem } from "./cart-store";

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "item-1",
  dishId: "dish-1",
  restoId: "resto-1",
  name: "Ndolé",
  price: 3500,
  qty: 1,
  ...overrides,
});

describe("cart-store", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("adds an item to empty cart", () => {
    useCartStore.getState().add(makeItem());
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].name).toBe("Ndolé");
  });

  it("increments qty when same item added twice", () => {
    const item = makeItem();
    useCartStore.getState().add(item);
    useCartStore.getState().add(item);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].qty).toBe(2);
  });

  it("removes an item by id", () => {
    useCartStore.getState().add(makeItem());
    useCartStore.getState().remove("item-1");
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("sets quantity and removes if qty <= 0", () => {
    useCartStore.getState().add(makeItem());
    useCartStore.getState().setQty("item-1", 5);
    expect(useCartStore.getState().items[0].qty).toBe(5);

    useCartStore.getState().setQty("item-1", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("sets note on an item", () => {
    useCartStore.getState().add(makeItem());
    useCartStore.getState().setNote("item-1", "Pas de piment");
    expect(useCartStore.getState().items[0].note).toBe("Pas de piment");
  });

  it("clears all items", () => {
    useCartStore.getState().add(makeItem({ id: "a" }));
    useCartStore.getState().add(makeItem({ id: "b" }));
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("handles multiple restaurants in same cart", () => {
    useCartStore.getState().add(makeItem({ id: "a", restoId: "r1" }));
    useCartStore.getState().add(makeItem({ id: "b", restoId: "r2" }));
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});
