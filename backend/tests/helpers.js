import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

/**
 * Points DATABASE_FILE at a fresh throwaway SQLite file before any app module
 * is imported, so each test file gets an isolated database.
 */
export function useIsolatedDatabase() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fbfs-test-'));
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_FILE = path.join(dir, 'test.db');
  process.env.SEED_ADMIN_EMAIL = 'owner@example.com';
  process.env.SEED_ADMIN_PASSWORD = 'TestPassword!123';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
}
