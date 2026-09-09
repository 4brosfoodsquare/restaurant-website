import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { useIsolatedDatabase, createTestMenuItems, TEST_MENU_ITEMS } from './helpers.js';

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

test('public menu listing returns active+available items from active categories with category info', async () => {
  const res = await request(app).get('/api/menu');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, TEST_MENU_ITEMS.length);
  const first = res.body.data[0];
  assert.ok('priceMinor' in first);
  assert.ok('categorySlug' in first);
});

test('public menu can be filtered by category slug', async () => {
  const res = await request(app).get('/api/menu?category=biriyani');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.every((item) => item.categorySlug === 'biriyani'));
});

test('public menu can be filtered by diet type', async () => {
  const res = await request(app).get('/api/menu?diet=veg');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.every((item) => item.dietType === 'veg'));
});

test('public menu search matches name', async () => {
  const res = await request(app).get('/api/menu?q=Chilli');
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.every((item) => item.name.toLowerCase().includes('chilli') || item.description.toLowerCase().includes('chilli')));
});

test('public item detail by slug works, unknown slug is 404', async () => {
  const list = await request(app).get('/api/menu?category=biriyani');
  const slug = list.body.data[0].slug;

  const found = await request(app).get(`/api/menu/${slug}`);
  assert.equal(found.status, 200);
  assert.equal(found.body.data.slug, slug);

  const missing = await request(app).get('/api/menu/does-not-exist');
  assert.equal(missing.status, 404);
});

test('creating a menu item requires owner/admin, staff is forbidden', async () => {
  const categories = await request(app).get('/api/categories');
  const categoryId = categories.body.data[0].id;

  const staffAttempt = await request(app)
    .post('/api/admin/menu')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ categoryId, name: 'Test Dish', priceMinor: 10000 });
  assert.equal(staffAttempt.status, 403);

  const ownerAttempt = await request(app)
    .post('/api/admin/menu')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ categoryId, name: 'Owner Test Dish', priceMinor: 10000 });
  assert.equal(ownerAttempt.status, 201);
  assert.equal(ownerAttempt.body.data.slug, 'owner-test-dish');
  assert.equal(ownerAttempt.body.data.isAvailable, true);
});

test('rejects creating a menu item with a non-existent category', async () => {
  const res = await request(app)
    .post('/api/admin/menu')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ categoryId: 999999, name: 'Ghost Dish', priceMinor: 10000 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_CATEGORY');
});

test('rejects a negative price', async () => {
  const categories = await request(app).get('/api/categories');
  const res = await request(app)
    .post('/api/admin/menu')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ categoryId: categories.body.data[0].id, name: 'Bad Price Dish', priceMinor: -100 });
  assert.equal(res.status, 422);
});

test('staff CAN toggle availability even though they cannot edit', async () => {
  const created = await request(app)
    .post('/api/admin/menu')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ categoryId: (await request(app).get('/api/categories')).body.data[0].id, name: 'Toggle Dish', priceMinor: 5000 });
  const id = created.body.data.id;

  const toggled = await request(app)
    .patch(`/api/admin/menu/${id}/availability`)
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ isAvailable: false });
  assert.equal(toggled.status, 200);
  assert.equal(toggled.body.data.isAvailable, false);

  // Unavailable items stay visible on the public menu (shown as "sold out")
  // rather than disappearing — only deactivation hides an item entirely.
  const publicList = await request(app).get('/api/menu');
  const publicItem = publicList.body.data.find((item) => item.id === id);
  assert.ok(publicItem, 'unavailable item should still appear in the public menu');
  assert.equal(publicItem.isAvailable, false);
});

test('deactivating an item removes it from public but keeps it in admin listing', async () => {
  const created = await request(app)
    .post('/api/admin/menu')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ categoryId: (await request(app).get('/api/categories')).body.data[0].id, name: 'Retired Dish', priceMinor: 5000 });
  const id = created.body.data.id;

  const deactivated = await request(app)
    .patch(`/api/admin/menu/${id}/active`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ isActive: false });
  assert.equal(deactivated.status, 200);

  const publicItem = await request(app).get(`/api/menu/${created.body.data.slug}`);
  assert.equal(publicItem.status, 404);

  const adminList = await request(app).get('/api/admin/menu?status=all').set('Authorization', `Bearer ${ownerToken}`);
  assert.ok(adminList.body.data.some((item) => item.id === id));
});

test('admin listing defaults to active status filter', async () => {
  const res = await request(app).get('/api/admin/menu').set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.data.every((item) => item.isActive === true));
});
