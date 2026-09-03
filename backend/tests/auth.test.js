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

before(async () => {
  runMigrations({ silent: true });
  await seed();
  app = createApp();
});

after(() => {
  closeDb();
});

test('rejects login with wrong password', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: 'wrong-password' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('rejects login for unknown email with same generic message', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nobody@example.com', password: 'whatever123' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('rejects malformed login payload with 422', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('logs in, reads /me, refreshes with rotation, and logs out', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: 'TestPassword!123' });

  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.role, 'owner');
  const accessToken = login.body.data.accessToken;
  assert.ok(accessToken);

  const setCookie = login.headers['set-cookie'];
  assert.ok(setCookie && setCookie.length > 0, 'expected a refresh cookie to be set');
  const cookie = setCookie[0];

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, 'owner@example.com');

  const meNoToken = await request(app).get('/api/auth/me');
  assert.equal(meNoToken.status, 401);

  const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
  assert.equal(refreshed.status, 200);
  const newCookie = refreshed.headers['set-cookie'][0];
  assert.notEqual(newCookie.split(';')[0], cookie.split(';')[0], 'refresh should rotate the cookie value');

  // The old (now-revoked) refresh cookie must no longer work.
  const reuseOldCookie = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
  assert.equal(reuseOldCookie.status, 401);

  const logout = await request(app).post('/api/auth/logout').set('Cookie', newCookie);
  assert.equal(logout.status, 204);

  const refreshAfterLogout = await request(app).post('/api/auth/refresh').set('Cookie', newCookie);
  assert.equal(refreshAfterLogout.status, 401);
});

test('deactivated account cannot log in', async () => {
  const { getDb } = await import('../src/db/index.js');
  getDb().prepare('UPDATE users SET is_active = 0 WHERE email_norm = ?').run('owner@example.com');

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: 'TestPassword!123' });
  assert.equal(res.status, 401);

  getDb().prepare('UPDATE users SET is_active = 1 WHERE email_norm = ?').run('owner@example.com');
});
