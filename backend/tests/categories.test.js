import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { useIsolatedDatabase } from './helpers.js';

useIsolatedDatabase();

const { runMigrations } = await import('../src/db/migrate.js');
const { default: seed } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { closeDb } = await import('../src/db/index.js');
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
  app = createApp();

  ownerToken = await loginAs('owner@example.com', 'TestPassword!123');

  const { getDb } = await import('../src/db/index.js');
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

test('public endpoint returns only active categories, signature ones included', async () => {
  const res = await request(app).get('/api/categories');
  assert.equal(res.status, 200);
  // The three offerings are menu items, not categories; the seed ships a
  // single bucket to satisfy the schema's category requirement.
  const slugs = res.body.data.map((c) => c.slug);
  assert.ok(slugs.includes('signature'));
  const signature = res.body.data.find((c) => c.slug === 'signature');
  assert.equal(signature.isSignature, true);
});

test('admin category list requires authentication', async () => {
  const res = await request(app).get('/api/admin/categories');
  assert.equal(res.status, 401);
});

test('staff can view admin category list but cannot create one', async () => {
  const list = await request(app).get('/api/admin/categories').set('Authorization', `Bearer ${staffToken}`);
  assert.equal(list.status, 200);

  const create = await request(app)
    .post('/api/admin/categories')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ name: 'Desserts' });
  assert.equal(create.status, 403);
});

test('owner can create a category and gets a unique auto-generated slug', async () => {
  const first = await request(app)
    .post('/api/admin/categories')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'Family Combo' });
  assert.equal(first.status, 201);
  assert.equal(first.body.data.slug, 'family-combo');

  const second = await request(app)
    .post('/api/admin/categories')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'Family Combo' });
  assert.equal(second.status, 201);
  assert.equal(second.body.data.slug, 'family-combo-2');
});

test('rejects a category with an empty name', async () => {
  const res = await request(app)
    .post('/api/admin/categories')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: '   ' });
  assert.equal(res.status, 422);
});

test('deactivating a category removes it from the public listing', async () => {
  const created = await request(app)
    .post('/api/admin/categories')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'Seasonal Specials' });
  const id = created.body.data.id;

  const deactivate = await request(app)
    .patch(`/api/admin/categories/${id}/active`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ isActive: false });
  assert.equal(deactivate.status, 200);
  assert.equal(deactivate.body.data.isActive, false);

  const publicList = await request(app).get('/api/categories');
  assert.ok(!publicList.body.data.some((c) => c.id === id));

  const adminList = await request(app).get('/api/admin/categories').set('Authorization', `Bearer ${ownerToken}`);
  assert.ok(adminList.body.data.some((c) => c.id === id));
});

test('reorder rejects unknown category ids', async () => {
  const res = await request(app)
    .patch('/api/admin/categories/reorder')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ order: [999999] });
  assert.equal(res.status, 409);
});

test('reorder accepts a valid ordering', async () => {
  const list = await request(app).get('/api/admin/categories').set('Authorization', `Bearer ${ownerToken}`);
  const ids = list.body.data.map((c) => c.id).reverse();

  const res = await request(app)
    .patch('/api/admin/categories/reorder')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ order: ids });
  assert.equal(res.status, 200);
  assert.equal(res.body.data[0].id, ids[0]);
});

test('returns 404 for a category that does not exist', async () => {
  const res = await request(app).get('/api/admin/categories/999999').set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(res.status, 404);
});
