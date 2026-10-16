/**
 * cart.js — Cart persistence for the Wander booking engine.
 *
 * A framework-free ES module. A "cart" is a plain object that can be
 * serialised to JSON and stored in any persistence layer (session, DB, etc.).
 * All mutations return a NEW cart object (immutable-style) so callers can
 * diff before/after without defensive cloning.
 *
 * @module cart
 */

/**
 * Creates a new, empty cart.
 *
 * @returns {{ items: Array, createdAt: string, updatedAt: string }}
 */
export function createCart() {
  const now = new Date().toISOString();
  return { items: [], createdAt: now, updatedAt: now };
}

/**
 * Adds an item to the cart. If an item with the same id already exists its
 * quantity is incremented by the supplied quantity (default 1).
 *
 * @param {{ items: Array }} cart
 * @param {{ id: string, name: string, pricePerNight: number, quantity?: number }} item
 * @returns {object} new cart with the item added/updated
 */
export function addItem(cart, item) {
  if (!item || !item.id) throw new Error('item.id is required');
  if (typeof item.pricePerNight !== 'number' || item.pricePerNight < 0) {
    throw new Error('item.pricePerNight must be a non-negative number');
  }

  const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  const existing = cart.items.find(i => i.id === item.id);

  const newItems = existing
    ? cart.items.map(i =>
        i.id === item.id ? { ...i, quantity: i.quantity + qty } : i,
      )
    : [...cart.items, { ...item, quantity: qty }];

  return { ...cart, items: newItems, updatedAt: new Date().toISOString() };
}

/**
 * Removes an item from the cart by id. Silently no-ops if the id is absent.
 *
 * @param {{ items: Array }} cart
 * @param {string} itemId
 * @returns {object} new cart without the item
 */
export function removeItem(cart, itemId) {
  return {
    ...cart,
    items: cart.items.filter(i => i.id !== itemId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates the quantity of an existing item. Throws if the item is not in the
 * cart. Use removeItem to delete.
 *
 * @param {{ items: Array }} cart
 * @param {string} itemId
 * @param {number} quantity  must be >= 1
 * @returns {object} new cart with updated quantity
 */
export function updateQuantity(cart, itemId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('quantity must be a positive integer');
  }
  const found = cart.items.some(i => i.id === itemId);
  if (!found) throw new Error(`item "${itemId}" not found in cart`);

  return {
    ...cart,
    items: cart.items.map(i => (i.id === itemId ? { ...i, quantity } : i)),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates the subtotal (sum of pricePerNight × quantity for each item).
 * Does NOT include taxes; see the pricing module for that.
 *
 * @param {{ items: Array }} cart
 * @returns {number} subtotal rounded to 2 decimal places
 */
export function getSubtotal(cart) {
  const raw = cart.items.reduce(
    (sum, i) => sum + i.pricePerNight * i.quantity,
    0,
  );
  return Math.round(raw * 100) / 100;
}

/**
 * Returns the total number of items (sum of quantities).
 *
 * @param {{ items: Array }} cart
 * @returns {number}
 */
export function getItemCount(cart) {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Empties the cart while preserving metadata timestamps.
 *
 * @param {{ items: Array }} cart
 * @returns {object} new cart with empty items array
 */
export function clearCart(cart) {
  return { ...cart, items: [], updatedAt: new Date().toISOString() };
}

/**
 * Serialises a cart to a JSON string suitable for storage (session, cookie,
 * database JSONB column, etc.).
 *
 * @param {object} cart
 * @returns {string}
 */
export function serializeCart(cart) {
  return JSON.stringify(cart);
}

/**
 * Deserialises a cart from a JSON string.  Validates the top-level shape and
 * returns a safe default if the string is empty/null.
 *
 * @param {string | null | undefined} json
 * @returns {object} cart
 */
export function deserializeCart(json) {
  if (!json) return createCart();
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.items)) {
    throw new Error('invalid cart JSON: missing items array');
  }
  return parsed;
}
