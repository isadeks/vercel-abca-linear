import { describe, it, expect, beforeEach } from 'vitest';
import {
  CartError,
  CART_ERRORS,
  createCart,
  addItem,
  removeItem,
  getCart,
  clearCart,
  destroyCart,
  cartCount,
} from '../api/_lib/cart.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function validItem(overrides = {}) {
  return {
    destination: 'Santorini',
    roomType: 'double',
    checkIn: '2026-08-01',
    checkOut: '2026-08-07',
    guests: 2,
    ...overrides,
  };
}

// Track carts created in each test so we can clean up
let _created = [];
function tracked_createCart() {
  const id = createCart();
  _created.push(id);
  return id;
}

// ── setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  // destroy any leftover carts from previous tests
  for (const id of _created) {
    try { destroyCart(id); } catch { /* already gone */ }
  }
  _created = [];
});

// ── createCart ────────────────────────────────────────────────────────────────

describe('createCart', () => {
  it('returns a non-empty string ID', () => {
    const id = tracked_createCart();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('each call returns a unique ID', () => {
    const a = tracked_createCart();
    const b = tracked_createCart();
    expect(a).not.toBe(b);
  });

  it('new cart has no items', () => {
    const id = tracked_createCart();
    const cart = getCart(id);
    expect(cart.items).toEqual([]);
  });

  it('increments cartCount', () => {
    const before = cartCount();
    tracked_createCart();
    expect(cartCount()).toBe(before + 1);
  });
});

// ── addItem ───────────────────────────────────────────────────────────────────

describe('addItem', () => {
  it('returns { cart, item } with an assigned itemId', () => {
    const cartId = tracked_createCart();
    const result = addItem(cartId, validItem());
    expect(result).toHaveProperty('cart');
    expect(result).toHaveProperty('item');
    expect(typeof result.item.itemId).toBe('string');
  });

  it('item appears in the cart', () => {
    const cartId = tracked_createCart();
    const { item } = addItem(cartId, validItem());
    const cart = getCart(cartId);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].itemId).toBe(item.itemId);
  });

  it('multiple items accumulate', () => {
    const cartId = tracked_createCart();
    addItem(cartId, validItem({ destination: 'Kyoto' }));
    addItem(cartId, validItem({ destination: 'Amalfi' }));
    expect(getCart(cartId).items).toHaveLength(2);
  });

  it('throws CART_NOT_FOUND for unknown cartId', () => {
    expect(() => addItem('nonexistent', validItem())).toThrow(CartError);
    expect(() => addItem('nonexistent', validItem())).toThrow(
      expect.objectContaining({ code: CART_ERRORS.CART_NOT_FOUND }),
    );
  });

  it('throws INVALID_ITEM when item is null', () => {
    const cartId = tracked_createCart();
    expect(() => addItem(cartId, null)).toThrow(
      expect.objectContaining({ code: CART_ERRORS.INVALID_ITEM }),
    );
  });

  it('throws INVALID_ITEM when a required field is missing', () => {
    const cartId = tracked_createCart();
    const item = validItem();
    delete item.destination;
    expect(() => addItem(cartId, item)).toThrow(
      expect.objectContaining({ code: CART_ERRORS.INVALID_ITEM }),
    );
  });

  it('throws INVALID_ITEM when guests < 1', () => {
    const cartId = tracked_createCart();
    expect(() => addItem(cartId, validItem({ guests: 0 }))).toThrow(
      expect.objectContaining({ code: CART_ERRORS.INVALID_ITEM }),
    );
  });

  it('throws INVALID_ITEM when checkOut is not after checkIn', () => {
    const cartId = tracked_createCart();
    expect(() =>
      addItem(cartId, validItem({ checkIn: '2026-08-10', checkOut: '2026-08-05' })),
    ).toThrow(expect.objectContaining({ code: CART_ERRORS.INVALID_ITEM }));
  });
});

// ── getCart ───────────────────────────────────────────────────────────────────

describe('getCart', () => {
  it('returns the cart with cartId and createdAt', () => {
    const cartId = tracked_createCart();
    const cart = getCart(cartId);
    expect(cart.cartId).toBe(cartId);
    expect(cart.createdAt).toBeInstanceOf(Date);
  });

  it('throws CART_NOT_FOUND for unknown cartId', () => {
    expect(() => getCart('ghost')).toThrow(
      expect.objectContaining({ code: CART_ERRORS.CART_NOT_FOUND }),
    );
  });
});

// ── removeItem ────────────────────────────────────────────────────────────────

describe('removeItem', () => {
  it('removes the item from the cart', () => {
    const cartId = tracked_createCart();
    const { item } = addItem(cartId, validItem());
    removeItem(cartId, item.itemId);
    expect(getCart(cartId).items).toHaveLength(0);
  });

  it('returns the updated cart', () => {
    const cartId = tracked_createCart();
    const { item } = addItem(cartId, validItem());
    const cart = removeItem(cartId, item.itemId);
    expect(cart.cartId).toBe(cartId);
  });

  it('only removes the targeted item when multiple exist', () => {
    const cartId = tracked_createCart();
    const { item: a } = addItem(cartId, validItem({ destination: 'A' }));
    addItem(cartId, validItem({ destination: 'B' }));
    removeItem(cartId, a.itemId);
    const cart = getCart(cartId);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].destination).toBe('B');
  });

  it('throws CART_NOT_FOUND for unknown cartId', () => {
    expect(() => removeItem('ghost', 'item_1')).toThrow(
      expect.objectContaining({ code: CART_ERRORS.CART_NOT_FOUND }),
    );
  });

  it('throws ITEM_NOT_FOUND for unknown itemId', () => {
    const cartId = tracked_createCart();
    expect(() => removeItem(cartId, 'no_such_item')).toThrow(
      expect.objectContaining({ code: CART_ERRORS.ITEM_NOT_FOUND }),
    );
  });
});

// ── clearCart ─────────────────────────────────────────────────────────────────

describe('clearCart', () => {
  it('removes all items but preserves the cart', () => {
    const cartId = tracked_createCart();
    addItem(cartId, validItem());
    addItem(cartId, validItem({ destination: 'Oslo' }));
    const cart = clearCart(cartId);
    expect(cart.items).toHaveLength(0);
    expect(cart.cartId).toBe(cartId);
  });

  it('cart is still accessible after clear', () => {
    const cartId = tracked_createCart();
    addItem(cartId, validItem());
    clearCart(cartId);
    expect(() => getCart(cartId)).not.toThrow();
  });

  it('throws CART_NOT_FOUND for unknown cartId', () => {
    expect(() => clearCart('ghost')).toThrow(
      expect.objectContaining({ code: CART_ERRORS.CART_NOT_FOUND }),
    );
  });
});

// ── destroyCart ───────────────────────────────────────────────────────────────

describe('destroyCart', () => {
  it('cart is no longer accessible after destroy', () => {
    const cartId = createCart(); // NOT tracked — we destroy it manually
    destroyCart(cartId);
    expect(() => getCart(cartId)).toThrow(
      expect.objectContaining({ code: CART_ERRORS.CART_NOT_FOUND }),
    );
  });

  it('decrements cartCount', () => {
    const cartId = createCart();
    const before = cartCount();
    destroyCart(cartId);
    expect(cartCount()).toBe(before - 1);
  });

  it('throws CART_NOT_FOUND for unknown cartId', () => {
    expect(() => destroyCart('ghost')).toThrow(
      expect.objectContaining({ code: CART_ERRORS.CART_NOT_FOUND }),
    );
  });
});

// ── CartError ─────────────────────────────────────────────────────────────────

describe('CartError', () => {
  it('is an instance of Error', () => {
    const err = new CartError('msg', 'CODE');
    expect(err).toBeInstanceOf(Error);
  });

  it('has name CartError', () => {
    const err = new CartError('msg', 'CODE');
    expect(err.name).toBe('CartError');
  });

  it('exposes the code', () => {
    const err = new CartError('msg', 'MY_CODE');
    expect(err.code).toBe('MY_CODE');
  });
});
