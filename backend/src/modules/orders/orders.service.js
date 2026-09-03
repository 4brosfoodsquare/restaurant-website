import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { generateOrderReference, generateTrackingToken } from '../../utils/ids.js';
import { getAllSettings } from '../settings/settings.repository.js';
import { findManyByIds } from '../menu/menu.repository.js';
import * as repo from './orders.repository.js';
import { canTransition, allowedNextStatuses } from './orderStatus.js';

const DEFAULT_CURRENCY = 'INR';
const MAX_REFERENCE_ATTEMPTS = 5;

function parseIntSetting(settings, key, fallback = 0) {
  const raw = settings[key];
  const parsed = raw === undefined ? fallback : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOrderTypesEnabled(settings) {
  try {
    const parsed = JSON.parse(settings.order_types_enabled ?? '["pickup","delivery"]');
    return Array.isArray(parsed) ? parsed : ['pickup', 'delivery'];
  } catch {
    return ['pickup', 'delivery'];
  }
}

function generateUniqueReference() {
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const candidate = generateOrderReference();
    if (!repo.findOrderByReferenceRaw(candidate)) return candidate;
  }
  throw conflict('Could not generate an order reference. Please try again.');
}

/**
 * Places an order. This is the single authoritative place where prices are
 * decided — the client only ever sends menu item ids and quantities.
 *
 * No `await` runs between the idempotency-key lookup and the database write:
 * combined with better-sqlite3's synchronous, single-process access, that
 * makes the whole "check, then insert" sequence atomic without needing a
 * database-level advisory lock.
 */
export function createOrder(input, { placedByUserId = null } = {}) {
  if (input.idempotencyKey) {
    const existing = repo.findOrderByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;
  }

  const settings = getAllSettings();
  const enabledTypes = parseOrderTypesEnabled(settings);
  if (!enabledTypes.includes(input.orderType)) {
    throw badRequest(`${input.orderType === 'delivery' ? 'Delivery' : 'Pickup'} is not currently available.`, {
      code: 'ORDER_TYPE_UNAVAILABLE',
    });
  }

  const requestedIds = [...new Set(input.items.map((line) => line.menuItemId))];
  const menuItems = findManyByIds(requestedIds);
  const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));

  const unavailable = [];
  const orderLines = [];
  let subtotalMinor = 0;

  for (const line of input.items) {
    const item = menuItemsById.get(line.menuItemId);
    const isOrderable = item && item.isActive === 1 && item.isAvailable === 1 && item.categoryIsActive === 1;
    if (!isOrderable) {
      unavailable.push({ menuItemId: line.menuItemId, name: item?.name ?? null });
      continue;
    }

    const lineTotalMinor = item.priceMinor * line.quantity;
    subtotalMinor += lineTotalMinor;
    orderLines.push({
      menuItemId: item.id,
      name: item.name,
      category: item.categoryName,
      dietType: item.dietType,
      unitPriceMinor: item.priceMinor,
      quantity: line.quantity,
      lineTotalMinor,
    });
  }

  if (unavailable.length > 0) {
    throw conflict('Some items in your cart are no longer available.', {
      code: 'ITEMS_UNAVAILABLE',
      details: { unavailable },
    });
  }

  const minOrderMinor = parseIntSetting(settings, 'min_order_minor', 0);
  if (minOrderMinor > 0 && subtotalMinor < minOrderMinor) {
    throw badRequest(`Minimum order amount is ${(minOrderMinor / 100).toFixed(2)}.`, { code: 'BELOW_MINIMUM_ORDER' });
  }

  const taxRateBps = parseIntSetting(settings, 'tax_rate_bps', 0);
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10_000);
  const deliveryFeeMinor = input.orderType === 'delivery' ? parseIntSetting(settings, 'delivery_fee_minor', 0) : 0;
  const discountMinor = 0;
  const totalMinor = subtotalMinor + taxMinor + deliveryFeeMinor - discountMinor;

  const order = {
    reference: generateUniqueReference(),
    trackingToken: generateTrackingToken(),
    idempotencyKey: input.idempotencyKey,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    orderType: input.orderType,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    addressCity: input.addressCity,
    addressPostcode: input.addressPostcode,
    addressNotes: input.addressNotes,
    scheduledFor: input.scheduledFor,
    customerNotes: input.customerNotes,
    currency: DEFAULT_CURRENCY,
    subtotalMinor,
    taxMinor,
    taxRateBps,
    deliveryFeeMinor,
    discountMinor,
    totalMinor,
    paymentMethod: 'pay_on_collection',
    placedByUserId,
  };

  const orderId = repo.createOrderWithItems({ order, items: orderLines });
  return repo.findOrderById(orderId);
}

export function getOrderByTrackingTokenOrThrow(token) {
  const order = repo.findOrderByTrackingToken(token);
  if (!order) throw notFound('We could not find an order with that tracking link.');
  return order;
}

export function listOrdersForAdmin(query) {
  return repo.listOrdersForAdmin({ status: query.status, orderType: query.orderType, limit: query.limit });
}

export function getOrderForAdminOrThrow(id) {
  const order = repo.findOrderById(id);
  if (!order) throw notFound('Order not found.');
  return order;
}

export function updateOrderStatus(id, { status, note }, actingUser) {
  const order = getOrderForAdminOrThrow(id);

  if (!canTransition(order.status, status)) {
    throw conflict(`Cannot move an order from "${order.status}" to "${status}".`, {
      code: 'INVALID_STATUS_TRANSITION',
      details: { from: order.status, allowed: allowedNextStatuses(order.status) },
    });
  }

  const updatedId = repo.transitionOrderStatus({
    orderId: id,
    expectedStatus: order.status,
    toStatus: status,
    note,
    changedBy: actingUser.id,
  });

  if (!updatedId) {
    throw conflict('This order was just updated by someone else. Please refresh and try again.', {
      code: 'STALE_ORDER_STATUS',
    });
  }

  return repo.findOrderById(updatedId);
}
