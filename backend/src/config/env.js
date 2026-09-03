import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(here, '..', '..');

dotenv.config({ path: path.join(BACKEND_ROOT, '.env'), quiet: true });

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

/** Development-only fallbacks. Production requires explicit, strong values. */
const DEV_ACCESS_SECRET = 'dev-only-access-secret-do-not-use-in-production-01';
const DEV_REFRESH_SECRET = 'dev-only-refresh-secret-do-not-use-in-production-1';

const MIN_SECRET_LENGTH = 32;

function readSecret(name, devFallback) {
  const value = process.env[name];
  if (value && value.length >= MIN_SECRET_LENGTH) return value;

  if (isProduction) {
    throw new Error(
      `Missing or weak ${name}. Set a random value of at least ${MIN_SECRET_LENGTH} characters ` +
        'before starting the server in production.',
    );
  }
  if (value && value.length > 0) {
    console.warn(`[config] ${name} is shorter than ${MIN_SECRET_LENGTH} chars — using it anyway (non-production).`);
    return value;
  }
  return devFallback;
}

function readInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function readList(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveFromRoot(value) {
  return path.isAbsolute(value) ? value : path.resolve(BACKEND_ROOT, value);
}

const accessSecret = readSecret('JWT_ACCESS_SECRET', DEV_ACCESS_SECRET);
const refreshSecret = readSecret('JWT_REFRESH_SECRET', DEV_REFRESH_SECRET);

if (isProduction && accessSecret === refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
}

const databaseFile = resolveFromRoot(
  process.env.DATABASE_FILE ?? (isTest ? './data/test.db' : './data/app.db'),
);
const uploadDir = resolveFromRoot(process.env.UPLOAD_DIR ?? './uploads');

fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const sameSite = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
const allowedSameSite = ['lax', 'strict', 'none'];

export const config = Object.freeze({
  env: NODE_ENV,
  isProduction,
  isTest,
  isDevelopment: !isProduction && !isTest,
  port: readInt('PORT', 4000),
  trustProxy: readBool('TRUST_PROXY', false),

  databaseFile,

  auth: Object.freeze({
    accessSecret,
    refreshSecret,
    accessTtlMinutes: readInt('ACCESS_TOKEN_TTL_MINUTES', 15),
    refreshTtlDays: readInt('REFRESH_TOKEN_TTL_DAYS', 7),
    bcryptRounds: isTest ? 4 : 12,
  }),

  cookie: Object.freeze({
    name: 'fbfs_refresh',
    sameSite: allowedSameSite.includes(sameSite) ? sameSite : 'lax',
    // `SameSite=None` is only honoured on secure cookies.
    secure: isProduction || sameSite === 'none',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/api/auth',
  }),

  corsOrigins: readList('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
  ]),

  uploads: Object.freeze({
    dir: uploadDir,
    maxBytes: readInt('MAX_UPLOAD_BYTES', 3 * 1024 * 1024),
    publicPath: '/uploads',
  }),

  publicApiUrl: (process.env.PUBLIC_API_URL ?? `http://localhost:${readInt('PORT', 4000)}`).replace(/\/+$/, ''),

  seed: Object.freeze({
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'owner@example.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2024',
    adminName: process.env.SEED_ADMIN_NAME ?? 'Restaurant Owner',
  }),
});

export default config;
