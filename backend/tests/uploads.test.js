import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { useIsolatedDatabase } from './helpers.js';

useIsolatedDatabase();
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fbfs-uploads-'));

const { runMigrations } = await import('../src/db/migrate.js');
const { default: seed } = await import('../src/db/seed.js');
const { createApp } = await import('../src/app.js');
const { closeDb, getDb } = await import('../src/db/index.js');
const request = (await import('supertest')).default;

let app;
let ownerToken;
let staffToken;

// A minimal but fully valid 1x1 PNG (real magic bytes + valid structure).
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

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
});

after(() => {
  closeDb();
});

test('rejects an upload with no authentication', async () => {
  const res = await request(app).post('/api/admin/uploads/image').attach('image', VALID_PNG, 'dish.png');
  assert.equal(res.status, 401);
});

test('staff cannot upload images (owner/admin only)', async () => {
  const res = await request(app)
    .post('/api/admin/uploads/image')
    .set('Authorization', `Bearer ${staffToken}`)
    .attach('image', VALID_PNG, 'dish.png');
  assert.equal(res.status, 403);
});

test('owner can upload a valid PNG and gets back an absolute usable URL', async () => {
  const res = await request(app)
    .post('/api/admin/uploads/image')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('image', VALID_PNG, 'dish.png');
  assert.equal(res.status, 201);
  assert.match(res.body.data.url, /^http:\/\/localhost:4000\/uploads\/.+\.png$/);
  assert.equal(res.body.data.mimeType, 'image/png');

  // The file must actually exist on disk under the generated (not original) name.
  const savedPath = path.join(process.env.UPLOAD_DIR, path.basename(res.body.data.url));
  assert.ok(fs.existsSync(savedPath));
});

test('rejects a non-image file even when named and labelled as one', async () => {
  const res = await request(app)
    .post('/api/admin/uploads/image')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('image', Buffer.from('#!/bin/sh\necho not an image\n'), { filename: 'totally-a-photo.png', contentType: 'image/png' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_IMAGE_CONTENT');
});

test('rejects a disallowed mimetype outright', async () => {
  const res = await request(app)
    .post('/api/admin/uploads/image')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('image', Buffer.from('<svg onload=alert(1)></svg>'), { filename: 'evil.svg', contentType: 'image/svg+xml' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'UNSUPPORTED_FILE_TYPE');
});

test('rejects a file larger than the configured limit', async () => {
  const big = Buffer.concat([VALID_PNG, Buffer.alloc(4 * 1024 * 1024, 0)]);
  const res = await request(app)
    .post('/api/admin/uploads/image')
    .set('Authorization', `Bearer ${ownerToken}`)
    .attach('image', big, { filename: 'huge.png', contentType: 'image/png' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'UPLOAD_ERROR');
});

test('rejects a request with no file at all', async () => {
  const res = await request(app)
    .post('/api/admin/uploads/image')
    .set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(res.status, 400);
});
