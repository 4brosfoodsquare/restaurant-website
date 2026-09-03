import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

/**
 * Access tokens are short-lived, stateless JWTs sent as `Authorization: Bearer`.
 * Refresh tokens are opaque random strings held in an httpOnly cookie; only
 * their SHA-256 hash is ever stored, so a database leak can't be replayed
 * and a single row can be revoked without touching a JWT secret.
 */

export function signAccessToken(user) {
  const expiresInSeconds = config.auth.accessTtlMinutes * 60;
  const token = jwt.sign(
    { sub: String(user.id), role: user.roleKey, email: user.email },
    config.auth.accessSecret,
    { expiresIn: expiresInSeconds },
  );
  return { token, expiresInSeconds };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.auth.accessSecret);
}

export function generateRefreshToken() {
  const value = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + config.auth.refreshTtlDays * 24 * 60 * 60 * 1000);
  return { value, hash: hashRefreshToken(value), expiresAt: expiresAt.toISOString() };
}

export function hashRefreshToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
