import { describe, it, expect } from 'vitest';
import {
  createCart,
  addItem,
  removeItem,
  updateQuantity,
  getSubtotal,
  getItemCount,
  clearCart,
  serializeCart,
  deserializeCart,
} from '../api/_lib/cart.js';

const ITEM_A = { id: 'room-101', name: 'Sea-view Double', pricePerNight: 120 };
const ITEM_B = { id: 'room-202', name: 'Mountain Suite', pricePerNight: 250 };

describe('createCart', () => {
  it('returns an empty cart with an items array', () => {
    const cart = createCart();
    expect(cart.items).toEqual([]);
  });

  it('records createdAt and updatedAt as ISO strings', () => {
    const cart = createCart();
    expect(() => new Date(cart.createdAt)).not.toThrow();
    expect(() => new Date(cart.updatedAt)).not.toThrow();
  });
});

describe('addItem', () => {
  it('adds a new item with default quantity 1', () => {
    const cart = addItem(createCart(), ITEM_A);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(1);
  });

  it('respects an explicit quantity', () => {
    const cart = addItem(createCart(), { ...ITEM_A, quantity: 3 });
    expect(cart.items[0].quantity).toBe(3);
  });

  it('increments quantity when the same item is added again', () => {
    let cart = createCart();
    cart = addItem(cart, ITEM_A);
    cart = addItem(cart, { ...ITEM_A, quantity: 2 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it('adds distinct items separately', () => {
    let cart = addItem(createCart(), ITEM_A);
    cart = addItem(cart, ITEM_B);
    expect(cart.items).toHaveLength(2);
  });

  it('does not mutate the original cart', () => {
    const original = createCart();
    addItem(original, ITEM_A);
    expect(original.items).toHaveLength(0);
  });

  it('throws if item has no id', () => {
    expect(() => addItem(createCart(), { name: 'No ID', pricePerNight: 10 })).toThrow();
  });

  it('throws if pricePerNight is negative', () => {
    expect(() => addItem(createCart(), { id: 'x', pricePerNight: -1 })).toThrow();
  });
});

describe('removeItem', () => {
  it('removes a present item', () => {
    let cart = addItem(createCart(), ITEM_A);
    cart = removeItem(cart, ITEM_A.id);
    expect(cart.items).toHaveLength(0);
  });

  it('no-ops when the item is absent', () => {
    let cart = addItem(createCart(), ITEM_A);
    cart = removeItem(cart, 'nonexistent');
    expect(cart.items).toHaveLength(1);
  });
});

describe('updateQuantity', () => {
  it('updates the quantity of a present item', () => {
    let cart = addItem(createCart(), ITEM_A);
    cart = updateQuantity(cart, ITEM_A.id, 5);
    expect(cart.items[0].quantity).toBe(5);
  });

  it('throws when the item is not in the cart', () => {
    expect(() => updateQuantity(createCart(), 'missing', 2)).toThrow();
  });

  it('throws if quantity is less than 1', () => {
    const cart = addItem(createCart(), ITEM_A);
    expect(() => updateQuantity(cart, ITEM_A.id, 0)).toThrow();
  });
});

describe('getSubtotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(getSubtotal(createCart())).toBe(0);
  });

  it('sums price × quantity across all items', () => {
    let cart = addItem(createCart(), { ...ITEM_A, quantity: 2 }); // 120 × 2 = 240
    cart = addItem(cart, { ...ITEM_B, quantity: 1 });             // 250 × 1 = 250
    expect(getSubtotal(cart)).toBe(490);
  });

  it('rounds to 2 decimal places', () => {
    const cart = addItem(createCart(), { id: 'x', name: 'X', pricePerNight: 33.333 });
    expect(getSubtotal(cart)).toBeCloseTo(33.33, 2);
  });
});

describe('getItemCount', () => {
  it('returns 0 for an empty cart', () => {
    expect(getItemCount(createCart())).toBe(0);
  });

  it('sums quantities', () => {
    let cart = addItem(createCart(), { ...ITEM_A, quantity: 2 });
    cart = addItem(cart, { ...ITEM_B, quantity: 3 });
    expect(getItemCount(cart)).toBe(5);
  });
});

describe('clearCart', () => {
  it('empties the items array', () => {
    let cart = addItem(createCart(), ITEM_A);
    cart = clearCart(cart);
    expect(cart.items).toHaveLength(0);
  });

  it('preserves createdAt', () => {
    const original = addItem(createCart(), ITEM_A);
    const cleared = clearCart(original);
    expect(cleared.createdAt).toBe(original.createdAt); // eslint no-issue
  });
});

describe('serializeCart / deserializeCart', () => {
  it('round-trips a cart through JSON', () => {
    let cart = addItem(createCart(), { ...ITEM_A, quantity: 2 });
    cart = addItem(cart, ITEM_B);
    const json = serializeCart(cart);
    const restored = deserializeCart(json);
    expect(restored.items).toHaveLength(2);
    expect(getSubtotal(restored)).toBe(getSubtotal(cart));
  });

  it('returns an empty cart for null/undefined input', () => {
    expect(deserializeCart(null).items).toEqual([]);
    expect(deserializeCart(undefined).items).toEqual([]);
  });

  it('throws on invalid JSON shape', () => {
    expect(() => deserializeCart('{"no_items":true}')).toThrow();
  });
});
