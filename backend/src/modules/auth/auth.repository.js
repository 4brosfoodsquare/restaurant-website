import { getDb } from '../../db/index.js';

export function findUserByEmail(email) {
  return getDb()
    .prepare(
      `SELECT users.id, users.email, users.name, users.password_hash AS passwordHash,
              users.is_active AS isActive, roles.key AS roleKey
       FROM users JOIN roles ON roles.id = users.role_id
       WHERE users.email_norm = ?`,
    )
    .get(email.toLowerCase());
}

export function touchLastLogin(userId) {
  getDb()
    .prepare(`UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
    .run(userId);
}

export function storeRefreshToken({ userId, tokenHash, expiresAt, userAgent }) {
  getDb()
    .prepare(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
       VALUES (?, ?, ?, ?)`,
    )
    .run(userId, tokenHash, expiresAt, userAgent ?? '');
}

export function findActiveRefreshToken(tokenHash) {
  return getDb()
    .prepare(
      `SELECT refresh_tokens.id, refresh_tokens.user_id AS userId, refresh_tokens.expires_at AS expiresAt,
              refresh_tokens.revoked_at AS revokedAt
       FROM refresh_tokens WHERE token_hash = ?`,
    )
    .get(tokenHash);
}

export function revokeRefreshTokenById(id) {
  getDb()
    .prepare(`UPDATE refresh_tokens SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND revoked_at IS NULL`)
    .run(id);
}

export function revokeRefreshTokenByHash(tokenHash) {
  getDb()
    .prepare(`UPDATE refresh_tokens SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE token_hash = ? AND revoked_at IS NULL`)
    .run(tokenHash);
}

export function findUserById(userId) {
  return getDb()
    .prepare(
      `SELECT users.id, users.email, users.name, users.is_active AS isActive, roles.key AS roleKey
       FROM users JOIN roles ON roles.id = users.role_id
       WHERE users.id = ?`,
    )
    .get(userId);
}
