import { getDb, transaction } from '../../db/index.js';

const ORDER_COLUMNS = `
  id, reference, tracking_token AS trackingToken, customer_name AS customerName,
  customer_phone AS customerPhone, customer_email AS customerEmail,
  order_type AS orderType, address_line1 AS addressLine1, address_line2 AS addressLine2,
  address_city AS addressCity, address_postcode AS addressPostcode, address_notes AS addressNotes,
  scheduled_for AS scheduledFor, customer_notes AS customerNotes,
  currency, subtotal_minor AS subtotalMinor, tax_minor AS taxMinor, tax_rate_bps AS taxRateBps,
  delivery_fee_minor AS deliveryFeeMinor, discount_minor AS discountMinor, total_minor AS totalMinor,
  status, cancellation_reason AS cancellationReason,
  payment_method AS paymentMethod, payment_status AS paymentStatus,
  created_at AS createdAt, updated_at AS updatedAt
`;

const ITEM_COLUMNS = `
  id, order_id AS orderId, menu_item_id AS menuItemId, name_snapshot AS name,
  category_snapshot AS category, diet_snapshot AS dietType,
  unit_price_minor AS unitPriceMinor, quantity, line_total_minor AS lineTotalMinor
`;

function attachItemsAndHistory(order) {
  if (!order) return order;
  const db = getDb();
  const items = db.prepare(`SELECT ${ITEM_COLUMNS} FROM order_items WHERE order_id = ? ORDER BY id ASC`).all(order.id);
  const history = db
    .prepare(
      `SELECT from_status AS fromStatus, to_status AS toStatus, note, created_at AS createdAt
       FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC, id ASC`,
    )
    .all(order.id);
  return { ...order, items, statusHistory: history };
}

export function findOrderByReferenceRaw(reference) {
  return getDb().prepare('SELECT id FROM orders WHERE reference = ?').get(reference);
}

export function findOrderByIdempotencyKey(idempotencyKey) {
  const order = getDb().prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE idempotency_key = ?`).get(idempotencyKey);
  return attachItemsAndHistory(order);
}

export function findOrderById(id) {
  const order = getDb().prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`).get(id);
  return attachItemsAndHistory(order);
}

export function findOrderByTrackingToken(token) {
  const order = getDb().prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE tracking_token = ?`).get(token);
  return attachItemsAndHistory(order);
}

/**
 * Manual lookup for a customer who no longer has their tracking link.
 * Requires BOTH the reference (only ~1.29e9 combinations, guessable) and the
 * phone number used on the order — knowing just one is not enough to see
 * someone else's order. Phone is compared digits-only so formatting
 * differences ("+91 98765 43210" vs "9876543210") still match.
 */
export function findOrderByReferenceAndPhone(reference, phone) {
  // Compare the last 10 digits only, so "+91 98765 43210" and "9876543210"
  // are recognized as the same number regardless of country-code formatting.
  const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
  const digitsOnlySql = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')";
  const order = getDb()
    .prepare(
      `SELECT ${ORDER_COLUMNS} FROM orders
       WHERE reference = ? AND SUBSTR(${digitsOnlySql}, -10) = ?`,
    )
    .get(reference.toUpperCase(), normalizedPhone);
  return attachItemsAndHistory(order);
}

/**
 * Creates the order, its line items, and the initial status-history row in
 * one atomic transaction — either every row is written, or none are.
 */
export function createOrderWithItems({ order, items }) {
  return transaction(() => {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO orders (
           reference, tracking_token, idempotency_key, customer_name, customer_phone, customer_email,
           order_type, address_line1, address_line2, address_city, address_postcode, address_notes,
           scheduled_for, customer_notes, currency, subtotal_minor, tax_minor, tax_rate_bps,
           delivery_fee_minor, discount_minor, total_minor, status, payment_method, payment_status,
           placed_by_user_id
         ) VALUES (
           @reference, @trackingToken, @idempotencyKey, @customerName, @customerPhone, @customerEmail,
           @orderType, @addressLine1, @addressLine2, @addressCity, @addressPostcode, @addressNotes,
           @scheduledFor, @customerNotes, @currency, @subtotalMinor, @taxMinor, @taxRateBps,
           @deliveryFeeMinor, @discountMinor, @totalMinor, 'new', @paymentMethod, 'unpaid',
           @placedByUserId
         )`,
      )
      .run({
        reference: order.reference,
        trackingToken: order.trackingToken,
        idempotencyKey: order.idempotencyKey ?? null,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail ?? null,
        orderType: order.orderType,
        addressLine1: order.addressLine1 ?? null,
        addressLine2: order.addressLine2 ?? null,
        addressCity: order.addressCity ?? null,
        addressPostcode: order.addressPostcode ?? null,
        addressNotes: order.addressNotes ?? null,
        scheduledFor: order.scheduledFor ?? null,
        customerNotes: order.customerNotes ?? '',
        currency: order.currency,
        subtotalMinor: order.subtotalMinor,
        taxMinor: order.taxMinor,
        taxRateBps: order.taxRateBps,
        deliveryFeeMinor: order.deliveryFeeMinor,
        discountMinor: order.discountMinor,
        totalMinor: order.totalMinor,
        paymentMethod: order.paymentMethod,
        placedByUserId: order.placedByUserId ?? null,
      });

    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, menu_item_id, name_snapshot, category_snapshot, diet_snapshot, unit_price_minor, quantity, line_total_minor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const item of items) {
      insertItem.run(orderId, item.menuItemId, item.name, item.category, item.dietType, item.unitPriceMinor, item.quantity, item.lineTotalMinor);
    }

    db.prepare(
      `INSERT INTO order_status_history (order_id, from_status, to_status, note) VALUES (?, NULL, 'new', 'Order placed.')`,
    ).run(orderId);

    return orderId;
  });
}

export function listOrdersForAdmin({ status, orderType, limit }) {
  const clauses = [];
  const params = [];

  if (status === 'active') {
    clauses.push("status NOT IN ('completed', 'cancelled')");
  } else if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (orderType) {
    clauses.push('order_type = ?');
    params.push(orderType);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit);

  // Item count only (not the full lines) — cheap enough to include on every
  // row via a correlated subquery, and lets the list view show it without a
  // per-order detail fetch.
  return getDb()
    .prepare(
      `SELECT ${ORDER_COLUMNS},
              (SELECT COUNT(*) FROM order_items WHERE order_items.order_id = orders.id) AS itemCount
       FROM orders ${where} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...params);
}

/**
 * Updates status and records history in one transaction. Returns the
 * updated order (with items/history) or null if `expectedStatus` no longer
 * matches — guards against two staff members racing to update the same order.
 */
export function transitionOrderStatus({ orderId, expectedStatus, toStatus, note, changedBy }) {
  return transaction(() => {
    const db = getDb();
    const current = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId);
    if (!current || current.status !== expectedStatus) return null;

    db.prepare(
      `UPDATE orders SET status = ?, cancellation_reason = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(toStatus, toStatus === 'cancelled' ? note || null : null, orderId);

    db.prepare(
      `INSERT INTO order_status_history (order_id, from_status, to_status, note, changed_by) VALUES (?, ?, ?, ?, ?)`,
    ).run(orderId, expectedStatus, toStatus, note ?? '', changedBy ?? null);

    return orderId;
  });
}
