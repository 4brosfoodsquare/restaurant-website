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
let adminToken;
let staffToken;
let adminId;
let staffId;

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
  const { hashPassword } = await import('../src/utils/password.js');
  const adminRole = db.prepare('SELECT id FROM roles WHERE key = ?').get('admin');
  const staffRole = db.prepare('SELECT id FROM roles WHERE key = ?').get('staff');

  adminId = db
    .prepare('INSERT INTO users (email, email_norm, name, password_hash, role_id) VALUES (?, ?, ?, ?, ?)')
    .run('manager@example.com', 'manager@example.com', 'Manager', await hashPassword('ManagerPass!123'), adminRole.id).lastInsertRowid;
  staffId = db
    .prepare('INSERT INTO users (email, email_norm, name, password_hash, role_id) VALUES (?, ?, ?, ?, ?)')
    .run('staff@example.com', 'staff@example.com', 'Kitchen Staff', await hashPassword('StaffPass!123'), staffRole.id).lastInsertRowid;

  adminToken = await loginAs('manager@example.com', 'ManagerPass!123');
  staffToken = await loginAs('staff@example.com', 'StaffPass!123');
});

after(() => {
  closeDb();
});

test('staff cannot reach the users admin API at all', async () => {
  const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${staffToken}`);
  assert.equal(res.status, 403);
});

test('owner and admin can both list users, staff excluded from access', async () => {
  const asOwner = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(asOwner.status, 200);
  assert.ok(asOwner.body.data.length >= 3);

  const asAdmin = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(asAdmin.status, 200);
});

test('admin (manager) can create a staff account but not an admin account', async () => {
  const staffCreate = await request(app)
    .post('/api/admin/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'newstaff@example.com', name: 'New Staff', role: 'staff', password: 'NewStaffPass!123' });
  assert.equal(staffCreate.status, 201);
  assert.equal(staffCreate.body.data.role, 'staff');

  const adminCreate = await request(app)
    .post('/api/admin/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'newadmin@example.com', name: 'New Admin', role: 'admin', password: 'NewAdminPass!123' });
  assert.equal(adminCreate.status, 403);
});

test('owner can create an admin account', async () => {
  const res = await request(app)
    .post('/api/admin/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: 'anothermanager@example.com', name: 'Another Manager', role: 'admin', password: 'AnotherPass!123' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.role, 'admin');
});

test('rejects creating a user with a duplicate email', async () => {
  const res = await request(app)
    .post('/api/admin/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email: 'owner@example.com', name: 'Dup', role: 'staff', password: 'WhateverPass!123' });
  assert.equal(res.status, 409);
});

test('admin (manager) cannot modify another admin account', async () => {
  const db = getDb();
  const otherAdminId = db.prepare("SELECT users.id FROM users JOIN roles ON roles.id=users.role_id WHERE roles.key='admin' AND users.email_norm != ?").get('manager@example.com').id;

  const res = await request(app)
    .patch(`/api/admin/users/${otherAdminId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Hijacked Name' });
  assert.equal(res.status, 403);
});

test('admin (manager) can deactivate a staff account, but not self', async () => {
  const deactivateStaff = await request(app)
    .patch(`/api/admin/users/${staffId}/active`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ isActive: false });
  assert.equal(deactivateStaff.status, 200);
  assert.equal(deactivateStaff.body.data.isActive, false);

  const deactivateSelf = await request(app)
    .patch(`/api/admin/users/${adminId}/active`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ isActive: false });
  assert.equal(deactivateSelf.status, 400);

  await request(app).patch(`/api/admin/users/${staffId}/active`).set('Authorization', `Bearer ${ownerToken}`).send({ isActive: true });
});

test('cannot deactivate or demote the last remaining owner', async () => {
  const db = getDb();
  const ownerId = db.prepare("SELECT users.id FROM users JOIN roles ON roles.id=users.role_id WHERE roles.key='owner'").get().id;

  const deactivate = await request(app)
    .patch(`/api/admin/users/${ownerId}/active`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ isActive: false });
  assert.equal(deactivate.status, 409);
  assert.equal(deactivate.body.error.code, 'LAST_OWNER');

  const demote = await request(app)
    .patch(`/api/admin/users/${ownerId}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ role: 'admin' });
  assert.equal(demote.status, 409);
  assert.equal(demote.body.error.code, 'LAST_OWNER');
});

test('a user (even staff, who cannot reach /api/admin/users at all) can change their own password via /api/auth/me/password', async () => {
  const wrongCurrent = await request(app)
    .patch('/api/auth/me/password')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ password: 'BrandNewPass!123', currentPassword: 'wrong-current' });
  assert.equal(wrongCurrent.status, 401);
  assert.equal(wrongCurrent.body.error.code, 'INVALID_CURRENT_PASSWORD');

  const correct = await request(app)
    .patch('/api/auth/me/password')
    .set('Authorization', `Bearer ${staffToken}`)
    .send({ password: 'BrandNewPass!123', currentPassword: 'StaffPass!123' });
  assert.equal(correct.status, 204);

  const loginWithNew = await request(app).post('/api/auth/login').send({ email: 'staff@example.com', password: 'BrandNewPass!123' });
  assert.equal(loginWithNew.status, 200);
});

test('rejects a self password change without a current password (validation)', async () => {
  const res = await request(app)
    .patch('/api/auth/me/password')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ password: 'SomeNewPassword!123' });
  assert.equal(res.status, 422);
});

test('a manager can reset a staff password without knowing the current one', async () => {
  const res = await request(app)
    .patch(`/api/admin/users/${staffId}/password`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ password: 'ResetByManager!123' });
  assert.equal(res.status, 204);

  const login = await request(app).post('/api/auth/login').send({ email: 'staff@example.com', password: 'ResetByManager!123' });
  assert.equal(login.status, 200);
});
