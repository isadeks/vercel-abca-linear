/**
 * Cart persistence module.
 *
 * Provides an in-memory cart store for the Wander booking checkout flow.
 * Carts are keyed by a generated cart ID and survive for the duration of
 * the server process (warm Vercel lambda lifetime).
 *
 * API:
 *   createCart()                     → cartId (string)
 *   addItem(cartId, item)            → { cart, item } | throws CartError
 *   removeItem(cartId, itemId)       → cart | throws CartError
 *   getCart(cartId)                  → cart | throws CartError
 *   clearCart(cartId)                → cart | throws CartError
 *   destroyCart(cartId)              → void | throws CartError
 *
 * A cart item has the shape:
 *   { itemId, destination, roomType, checkIn, checkOut, guests }
 *
 * CartError is thrown for invalid operations (unknown cartId, bad item, etc.).
 */

// ── Error type ────────────────────────────────────────────────────────────────

export class CartError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CartError';
    this.code = code;
  }
}

export const CART_ERRORS = {
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  INVALID_ITEM: 'INVALID_ITEM',
};

// ── Internal store ────────────────────────────────────────────────────────────

/** @type {Map<string, { cartId: string, items: Map<string, object>, createdAt: Date }>} */
const _store = new Map();

let _cartCounter = 0;
let _itemCounter = 0;

function _nextCartId() {
  _cartCounter += 1;
  return `cart_${Date.now()}_${_cartCounter}`;
}

function _nextItemId() {
  _itemCounter += 1;
  return `item_${Date.now()}_${_itemCounter}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

const REQUIRED_ITEM_FIELDS = ['destination', 'roomType', 'checkIn', 'checkOut', 'guests'];

function _validateItem(item) {
  if (!item || typeof item !== 'object') {
    throw new CartError('Item must be a non-null object', CART_ERRORS.INVALID_ITEM);
  }
  for (const field of REQUIRED_ITEM_FIELDS) {
    if (item[field] === undefined || item[field] === null) {
      throw new CartError(`Item is missing required field: ${field}`, CART_ERRORS.INVALID_ITEM);
    }
  }
  if (typeof item.guests !== 'number' || item.guests < 1) {
    throw new CartError('Item guests must be a positive integer', CART_ERRORS.INVALID_ITEM);
  }
  if (item.checkIn >= item.checkOut) {
    throw new CartError('Item checkOut must be after checkIn', CART_ERRORS.INVALID_ITEM);
  }
}

// ── Serialisation helper ──────────────────────────────────────────────────────

function _serializeCart(entry) {
  return {
    cartId: entry.cartId,
    createdAt: entry.createdAt,
    items: Array.from(entry.items.values()),
  };
}

function _requireCart(cartId) {
  const entry = _store.get(cartId);
  if (!entry) {
    throw new CartError(`Cart not found: ${cartId}`, CART_ERRORS.CART_NOT_FOUND);
  }
  return entry;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new, empty cart.
 * @returns {string} cartId
 */
export function createCart() {
  const cartId = _nextCartId();
  _store.set(cartId, {
    cartId,
    items: new Map(),
    createdAt: new Date(),
  });
  return cartId;
}

/**
 * Add an item to a cart.
 * @param {string} cartId
 * @param {{ destination: string, roomType: string, checkIn: string, checkOut: string, guests: number }} item
 * @returns {{ cart: object, item: object }}
 */
export function addItem(cartId, item) {
  const entry = _requireCart(cartId);
  _validateItem(item);
  const itemId = _nextItemId();
  const stored = { ...item, itemId };
  entry.items.set(itemId, stored);
  return { cart: _serializeCart(entry), item: stored };
}

/**
 * Remove an item from a cart by itemId.
 * @param {string} cartId
 * @param {string} itemId
 * @returns {object} updated cart
 */
export function removeItem(cartId, itemId) {
  const entry = _requireCart(cartId);
  if (!entry.items.has(itemId)) {
    throw new CartError(`Item not found: ${itemId}`, CART_ERRORS.ITEM_NOT_FOUND);
  }
  entry.items.delete(itemId);
  return _serializeCart(entry);
}

/**
 * Get the current state of a cart.
 * @param {string} cartId
 * @returns {object} cart
 */
export function getCart(cartId) {
  const entry = _requireCart(cartId);
  return _serializeCart(entry);
}

/**
 * Remove all items from a cart (cart itself remains).
 * @param {string} cartId
 * @returns {object} cart
 */
export function clearCart(cartId) {
  const entry = _requireCart(cartId);
  entry.items.clear();
  return _serializeCart(entry);
}

/**
 * Destroy a cart entirely.
 * @param {string} cartId
 */
export function destroyCart(cartId) {
  _requireCart(cartId);
  _store.delete(cartId);
}

/**
 * Return the number of carts currently in the store (useful for testing).
 * @returns {number}
 */
export function cartCount() {
  return _store.size;
}
