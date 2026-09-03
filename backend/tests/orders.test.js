import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { useIsolatedDatabase } from './helpers.js';

useIsolatedDatabase();

const { runMigrations } = await import('../src/db/migrate.js');
const { default: seed } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { closeDb, getDb } = await import('../src/db/index.js');
const request = (await import('supertest')).default;

let app;
let ownerToken;
let staffToken;
let biriyaniItem;
let secondItem;

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

before(async () => {
  runMigrations({ silent: true });
  await seed();
  app = createApp();

  ownerToken = await loginAs('owner@example.com', 'TestPassword!123');

  const db = getDb();
  const staffRole = db.prepare('SELECT id FROM roles WHERE key = ?').get('staff');
  const { hashPassword } = await import('../src/utils/password.js');
  db.prepare('INSERT INTO users (email, email_norm, name, password_hash, role_id) VALUES (?, ?, ?, ?, ?)').run(
    'staff@example.com', 'staff@example.com', 'Kitchen Staff', await hashPassword('StaffPass!123'), staffRole.id,
  );
  staffToken = await loginAs('staff@example.com', 'StaffPass!123');

  const menu = await request(app).get('/api/menu?category=biriyani');
  biriyaniItem = menu.body.data[0];
  secondItem = menu.body.data[1];
});

after(() => {
  closeDb();
});

function validPickupPayload(overrides = {}) {
  return {
    orderType: 'pickup',
    customerName: 'Test Customer',
    customerPhone: '+91 98765 43210',
    items: [{ menuItemId: biriyaniItem.id, quantity: 2 }],
    ...overrides,
  };
}

test('rejects an order with an empty cart', async () => {
  const res = await request(app).post('/api/orders').send(validPickupPayload({ items: [] }));
  assert.equal(res.status, 422);
});

test('rejects a delivery order without an address', async () => {
  const res = await request(app)
    .post('/api/orders')
    .send({ ...validPickupPayload(), orderType: 'delivery' });
  assert.equal(res.status, 422);
});

test('rejects an order referencing a non-existent menu item', async () => {
  const res = await request(app)
    .post('/api/orders')
    .send(validPickupPayload({ items: [{ menuItemId: 999999, quantity: 1 }] }));
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'ITEMS_UNAVAILABLE');
});

test('computes subtotal/total from the authoritative server-side price, ignoring any client price', async () => {
  const res = await request(app)
    .post('/api/orders')
    .send(
      validPickupPayload({
        items: [
          { menuItemId: biriyaniItem.id, quantity: 2, priceMinor: 1 }, // client-sent price must be ignored
        ],
      }),
    );
  assert.equal(res.status, 201);
  assert.equal(res.body.data.subtotalMinor, biriyaniItem.priceMinor * 2);
  assert.equal(res.body.data.totalMinor, biriyaniItem.priceMinor * 2);
  assert.equal(res.body.data.status, 'new');
  assert.equal(res.body.data.items.length, 1);
  assert.equal(res.body.data.items[0].unitPriceMinor, biriyaniItem.priceMinor);
  assert.ok(res.body.data.reference.startsWith('FB-'));
  assert.ok(res.body.data.trackingToken);
});

test('a valid delivery order with address succeeds', async () => {
  const res = await request(app).post('/api/orders').send({
    orderType: 'delivery',
    customerName: 'Delivery Customer',
    customerPhone: '9876543210',
    addressLine1: '123 Test Street',
    addressCity: 'Test City',
    addressPostcode: '560001',
    items: [{ menuItemId: biriyaniItem.id, quantity: 1 }],
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.orderType, 'delivery');
});

test('marking an item unavailable makes ordering it fail', async () => {
  await request(app)
    .patch(`/api/admin/menu/${secondItem.id}/availability`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ isAvailable: false });

  const res = await request(app)
    .post('/api/orders')
    .send(validPickupPayload({ items: [{ menuItemId: secondItem.id, quantity: 1 }] }));
  assert.equal(res.status, 409);
  assert.equal(res.body.error.details.unavailable[0].menuItemId, secondItem.id);

  await request(app)
    .patch(`/api/admin/menu/${secondItem.id}/availability`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ isAvailable: true });
});

test('idempotency key prevents duplicate orders on resubmit', async () => {
  const payload = validPickupPayload({ idempotencyKey: 'test-idem-key-12345' });

  const first = await request(app).post('/api/orders').send(payload);
  assert.equal(first.status, 201);

  const second = await request(app).post('/api/orders').send(payload);
  assert.equal(second.status, 201);
  assert.equal(second.body.data.id, first.body.data.id, 'resubmitting the same idempotency key must not create a new order');
});

test('customer can track an order by its tracking token, wrong token 404s', async () => {
  const created = await request(app).post('/api/orders').send(validPickupPayload());
  const token = created.body.data.trackingToken;

  const found = await request(app).get(`/api/orders/track/${token}`);
  assert.equal(found.status, 200);
  assert.equal(found.body.data.reference, created.body.data.reference);

  const notFoundRes = await request(app).get('/api/orders/track/not-a-real-token');
  assert.equal(notFoundRes.status, 404);
});

test('admin order routes require authentication', async () => {
  const res = await request(app).get('/api/admin/orders');
  assert.equal(res.status, 401);
});

test('staff can list orders and advance status through the full lifecycle', async () => {
  const created = await request(app).post('/api/orders').send(validPickupPayload());
  const id = created.body.data.id;

  const list = await request(app).get('/api/admin/orders?status=new').set('Authorization', `Bearer ${staffToken}`);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.some((o) => o.id === id));

  for (const status of ['accepted', 'preparing', 'ready', 'completed']) {
    const res = await request(app)
      .patch(`/api/admin/orders/${id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status });
    assert.equal(res.status, 200, `transition to ${status} should succeed`);
    assert.equal(res.body.data.status, status);
  }

  const detail = await request(app).get(`/api/admin/orders/${id}`).set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(detail.body.data.statusHistory.length, 5); // new + 4 transitions
});

test('rejects an invalid status transition (cannot skip states or move a terminal order)', async () => {
  const created = await request(app).post('/api/orders').send(validPickupPayload());
  const id = created.body.data.id;

  const skip = await request(app)
    .patch(`/api/admin/orders/${id}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'preparing' });
  assert.equal(skip.status, 409);
  assert.equal(skip.body.error.code, 'INVALID_STATUS_TRANSITION');

  await request(app).patch(`/api/admin/orders/${id}/status`).set('Authorization', `Bearer ${staffToken}`).send({ status: 'accepted' });
  await request(app).patch(`/api/admin/orders/${id}/status`).set('Authorization', `Bearer ${staffToken}`).send({ status: 'cancelled' });

  const afterTerminal = await request(app)
    .patch(`/api/admin/orders/${id}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'preparing' });
  assert.equal(afterTerminal.status, 409);
});

test('cancellation reason is stored from the note field', async () => {
  const created = await request(app).post('/api/orders').send(validPickupPayload());
  const id = created.body.data.id;

  const cancelled = await request(app)
    .patch(`/api/admin/orders/${id}/status`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ status: 'cancelled', note: 'Customer called to cancel.' });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.cancellationReason, 'Customer called to cancel.');
});

test('order lookup by reference + phone succeeds, tolerating formatting differences', async () => {
  const created = await request(app).post('/api/orders').send(
    validPickupPayload({ customerPhone: '+91 98765 43210', idempotencyKey: 'lookup-key-1' }),
  );
  assert.equal(created.status, 201);

  const found = await request(app)
    .post('/api/orders/lookup')
    .send({ reference: created.body.data.reference, phone: '9876543210' });
  assert.equal(found.status, 200);
  assert.equal(found.body.data.id, created.body.data.id);
});

test('order lookup fails with wrong phone, and with wrong reference', async () => {
  const created = await request(app).post('/api/orders').send(
    validPickupPayload({ customerPhone: '9998887776', idempotencyKey: 'lookup-key-2' }),
  );

  const wrongPhone = await request(app)
    .post('/api/orders/lookup')
    .send({ reference: created.body.data.reference, phone: '1112223334' });
  assert.equal(wrongPhone.status, 404);

  const wrongReference = await request(app)
    .post('/api/orders/lookup')
    .send({ reference: 'FB-ZZZZZZ', phone: '9998887776' });
  assert.equal(wrongReference.status, 404);
});

test('order lookup is rate limited', async () => {
  for (let i = 0; i < 20; i += 1) {
    await request(app).post('/api/orders/lookup').send({ reference: 'FB-NOPE01', phone: '0000000000' });
  }
  const res = await request(app).post('/api/orders/lookup').send({ reference: 'FB-NOPE01', phone: '0000000000' });
  assert.equal(res.status, 429);
});
