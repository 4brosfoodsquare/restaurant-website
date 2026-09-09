import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { useIsolatedDatabase, createTestMenuItems } from './helpers.js';

useIsolatedDatabase();

const { runMigrations } = await import('../src/db/migrate.js');
const { default: seed } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { closeDb, getDb } = await import('../src/db/index.js');
const request = (await import('supertest')).default;

let app;
let ownerToken;
let staffToken;

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

before(async () => {
  runMigrations({ silent: true });
  await seed();
  createTestMenuItems(getDb());
  app = createApp();

  ownerToken = await loginAs('owner@example.com', 'TestPassword!123');

  const db = getDb();
  const staffRole = db.prepare('SELECT id FROM roles WHERE key = ?').get('staff');
  const { hashPassword } = await import('../src/utils/password.js');
  db.prepare('INSERT INTO users (email, email_norm, name, password_hash, role_id) VALUES (?, ?, ?, ?, ?)').run(
    'staff@example.com', 'staff@example.com', 'Kitchen Staff', await hashPassword('StaffPass!123'), staffRole.id,
  );
  staffToken = await loginAs('staff@example.com', 'StaffPass!123');
});

after(() => {
  closeDb();
});

test('public settings endpoint returns typed restaurant info with no auth required', async () => {
  const res = await request(app).get('/api/settings');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.restaurantName, '4 Bros Food Square');
  assert.deepEqual(res.body.data.orderTypesEnabled, ['pickup', 'delivery']);
  assert.equal(typeof res.body.data.taxRateBps, 'number');
  assert.ok(res.body.data.hours.mon);
});

test('admin settings requires authentication', async () => {
  const res = await request(app).get('/api/admin/settings');
  assert.equal(res.status, 401);
});

test('staff can read settings but cannot update them', async () => {
  const read = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${staffToken}`);
  assert.equal(read.status, 200);

  const write = await request(app)
    .patch('/api/admin/settings')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ tagline: 'New tagline' });
  assert.equal(write.status, 403);
});

test('owner can update settings, and public endpoint reflects the change', async () => {
  const update = await request(app)
    .patch('/api/admin/settings')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ tagline: 'Fresh biriyani, every day.', deliveryFeeMinor: 4900, taxRateBps: 500 });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.tagline, 'Fresh biriyani, every day.');
  assert.equal(update.body.data.deliveryFeeMinor, 4900);

  const publicSettings = await request(app).get('/api/settings');
  assert.equal(publicSettings.body.data.tagline, 'Fresh biriyani, every day.');
  assert.equal(publicSettings.body.data.taxRateBps, 500);
});

test('a partial hours update merges into existing hours rather than replacing them', async () => {
  const before = await request(app).get('/api/settings');
  const originalTue = before.body.data.hours.tue;

  const update = await request(app)
    .patch('/api/admin/settings')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ hours: { mon: 'closed' } });
  assert.equal(update.status, 200);
  assert.equal(update.body.data.hours.mon, 'closed');
  assert.equal(update.body.data.hours.tue, originalTue, 'unrelated days must be preserved, not wiped');
});

test('rejects an invalid order type in orderTypesEnabled', async () => {
  const res = await request(app)
    .patch('/api/admin/settings')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ orderTypesEnabled: ['dine_in'] });
  assert.equal(res.status, 422);
});

test('rejects a negative delivery fee', async () => {
  const res = await request(app)
    .patch('/api/admin/settings')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ deliveryFeeMinor: -500 });
  assert.equal(res.status, 422);
});

test('disabling delivery via settings makes a delivery order fail', async () => {
  await request(app)
    .patch('/api/admin/settings')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ orderTypesEnabled: ['pickup'] });

  const menu = await request(app).get('/api/menu?category=biriyani');
  const res = await request(app).post('/api/orders').send({
    orderType: 'delivery',
    customerName: 'Test',
    customerPhone: '9876543210',
    addressLine1: '1 Test Rd',
    addressCity: 'Test City',
    addressPostcode: '560001',
    items: [{ menuItemId: menu.body.data[0].id, quantity: 1 }],
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'ORDER_TYPE_UNAVAILABLE');

  await request(app)
    .patch('/api/admin/settings')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ orderTypesEnabled: ['pickup', 'delivery'] });
});
