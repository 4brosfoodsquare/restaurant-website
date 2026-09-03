import { unauthorized, forbidden } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { getDb } from '../db/index.js';

/**
 * Requires a valid `Authorization: Bearer <accessToken>` header.
 * Attaches `req.user = { id, email, name, roleKey, isActive }` on success.
 * The account is re-checked against the database on every request so a
 * deactivated staff member loses access immediately, not just at token expiry.
 */
export function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(unauthorized('Please log in to continue.'));
    return;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(unauthorized('Your session has expired. Please log in again.', { code: 'TOKEN_EXPIRED' }));
    return;
  }

  const row = getDb()
    .prepare(
      `SELECT users.id, users.email, users.name, users.is_active AS isActive, roles.key AS roleKey
       FROM users JOIN roles ON roles.id = users.role_id
       WHERE users.id = ?`,
    )
    .get(Number(payload.sub));

  if (!row || !row.isActive) {
    next(unauthorized('Your session is no longer valid. Please log in again.'));
    return;
  }

  req.user = row;
  next();
}

/** Restricts a route to one or more role keys. Must run after requireAuth. */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      next(unauthorized('Please log in to continue.'));
      return;
    }
    if (!allowedRoles.includes(req.user.roleKey)) {
      next(forbidden('You do not have permission to do this.'));
      return;
    }
    next();
  };
}
