import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { useIsolatedDatabase } from './helpers.js';

useIsolatedDatabase();

const { runMigrations } = await import('../src/db/migrate.js');
const { createApp } = await import('../src/app.js');
const { closeDb } = await import('../src/db/index.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const request = (await import('supertest')).default;

let app;

before(() => {
  runMigrations({ silent: true });
  app = createApp();
});

after(() => {
  closeDb();
});

test('malformed JSON in a request body returns 400, not a generic 500', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{not valid json');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_JSON');
});

test('an unknown route returns a clean 404, not a stack trace', async () => {
  const res = await request(app).get('/api/this-route-does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

/**
 * `config` (imported by errorHandler.js) freezes `isDevelopment` from
 * process.env.NODE_ENV at module-load time — this test suite already runs
 * with NODE_ENV=test, so mutating process.env at runtime wouldn't change
 * it. Calling errorHandler directly with a fake req/res, in whatever env
 * this suite actually runs under (isDevelopment is false for both "test"
 * and "production"), is what actually proves an unexpected error's raw
 * message never reaches the client outside real local development.
 */
test('an unexpected (non-HttpError) failure never leaks its raw message to the client', () => {
  const req = { method: 'GET', originalUrl: '/api/whatever' };
  let statusCode;
  let jsonBody;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
    },
  };

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error('leaked-db-password=hunter2'), req, res, () => {});
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(statusCode, 500);
  assert.equal(jsonBody.error.code, 'INTERNAL_ERROR');
  assert.equal(JSON.stringify(jsonBody).includes('leaked-db-password'), false);
});
