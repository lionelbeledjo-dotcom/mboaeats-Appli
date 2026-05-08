import { describe, it, expect, beforeEach } from "vitest";
import {
  addToCart,
  removeFromCart,
  getCartItems,
  clearCart,
  type CartItem,
} from "./use-cart";

// Mute the cart sound (no AudioContext in happy-dom).
// @ts-expect-error - test stub
globalThis.HTMLMediaElement = class {};

const sample: CartItem = {
  id: "ndole-001__spicy_extra-plantain",
  dishId: "ndole-001",
  restoId: "mama-bello",
  name: "Ndolé royal",
  price: 4500,
  qty: 3,
  image: "https://example.com/ndole.jpg",
  options: { piment: "fort", accompagnement: "plantain" },
};

describe("Cart undo (toast Annuler) — non-régression", () => {
  beforeEach(() => clearCart());

  it("restaure exactement le même article (id, qty, options) après remove + addToCart(snapshot)", () => {
    addToCart(sample);
    expect(getCartItems()).toHaveLength(1);

    // Reproduit Summary.handleRemove
    const item = getCartItems()[0]!;
    const snapshot: CartItem = { ...item, options: { ...(item.options ?? {}) } };
    removeFromCart(item.id);
    expect(getCartItems()).toHaveLength(0);

    // L'utilisateur clique sur "Annuler" dans les 5 s
    addToCart(snapshot);

    const restored = getCartItems()[0]!;
    expect(restored.id).toBe(sample.id);
    expect(restored.dishId).toBe(sample.dishId);
    expect(restored.restoId).toBe(sample.restoId);
    expect(restored.name).toBe(sample.name);
    expect(restored.price).toBe(sample.price);
    expect(restored.qty).toBe(sample.qty);
    expect(restored.image).toBe(sample.image);
    expect(restored.options).toEqual(sample.options);
  });

  it("reste stable après plusieurs lectures (simule des re-rendus de Checkout)", () => {
    addToCart(sample);
    const item = getCartItems()[0]!;
    const snapshot: CartItem = { ...item, options: { ...(item.options ?? {}) } };
    removeFromCart(item.id);

    // Plusieurs re-rendus avant le clic Annuler ne doivent rien casser
    for (let i = 0; i < 5; i++) {
      expect(getCartItems()).toHaveLength(0);
    }

    addToCart(snapshot);

    // Plusieurs re-rendus après restauration : l'item reste identique
    for (let i = 0; i < 5; i++) {
      const items = getCartItems();
      expect(items).toHaveLength(1);
      expect(items[0]!).toMatchObject({
        id: sample.id,
        qty: sample.qty,
        options: sample.options,
      });
    }
  });

  it("ne duplique ni n'altère un item existant si l'utilisateur a re-créé le même entre temps", () => {
    addToCart(sample);
    const snapshot: CartItem = {
      ...getCartItems()[0]!,
      options: { ...(sample.options ?? {}) },
    };
    removeFromCart(sample.id);

    // L'utilisateur re-ajoute le même plat manuellement (qty 1) avant d'annuler
    addToCart({ ...sample, qty: 1 });
    // Puis clique Annuler → le snapshot (qty 3) doit fusionner sans altérer les options
    addToCart(snapshot);

    const items = getCartItems();
    expect(items).toHaveLength(1);
    expect(items[0]!.qty).toBe(1 + sample.qty);
    expect(items[0]!.options).toEqual(sample.options);
  });
});
