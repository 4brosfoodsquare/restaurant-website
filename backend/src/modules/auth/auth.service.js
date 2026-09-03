import { unauthorized } from '../../utils/httpError.js';
import { verifyPassword } from '../../utils/password.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../../utils/tokens.js';
import {
  findUserByEmail,
  findUserById,
  touchLastLogin,
  storeRefreshToken,
  findActiveRefreshToken,
  revokeRefreshTokenById,
  revokeRefreshTokenByHash,
} from './auth.repository.js';

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.roleKey };
}

export async function login({ email, password, userAgent }) {
  const user = findUserByEmail(email);

  // Same generic message whether the email is unknown or the password is
  // wrong — never reveal which one it was, and always hash-compare to keep
  // the response time constant regardless of whether the user exists.
  const dummyHash = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8k9OQPYd7HAyBFVBs3AAiQm.oIitVy';
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? dummyHash);

  if (!user || !user.isActive || !passwordOk) {
    throw unauthorized('Incorrect email or password.', { code: 'INVALID_CREDENTIALS' });
  }

  touchLastLogin(user.id);
  const { token: accessToken, expiresInSeconds } = signAccessToken({ id: user.id, roleKey: user.roleKey, email: user.email });
  const refresh = generateRefreshToken();
  storeRefreshToken({ userId: user.id, tokenHash: refresh.hash, expiresAt: refresh.expiresAt, userAgent });

  return {
    user: toPublicUser(user),
    accessToken,
    accessTokenExpiresInSeconds: expiresInSeconds,
    refreshToken: refresh.value,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

/** Rotates a refresh token: the presented value is revoked and a new one issued. */
export async function refreshSession({ refreshTokenValue, userAgent }) {
  if (!refreshTokenValue) {
    throw unauthorized('Please log in again.');
  }

  const tokenHash = hashRefreshToken(refreshTokenValue);
  const record = findActiveRefreshToken(tokenHash);

  if (!record || record.revokedAt || new Date(record.expiresAt).getTime() < Date.now()) {
    throw unauthorized('Your session has expired. Please log in again.');
  }

  const user = findUserById(record.userId);
  if (!user || !user.isActive) {
    throw unauthorized('Your session is no longer valid. Please log in again.');
  }

  // Rotation: old token is revoked the instant the new one is issued, so a
  // stolen-then-replayed refresh token is only ever usable once.
  revokeRefreshTokenById(record.id);
  const { token: accessToken, expiresInSeconds } = signAccessToken({ id: user.id, roleKey: user.roleKey, email: user.email });
  const refresh = generateRefreshToken();
  storeRefreshToken({ userId: user.id, tokenHash: refresh.hash, expiresAt: refresh.expiresAt, userAgent });

  return {
    user: toPublicUser(user),
    accessToken,
    accessTokenExpiresInSeconds: expiresInSeconds,
    refreshToken: refresh.value,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

export function logout({ refreshTokenValue }) {
  if (!refreshTokenValue) return;
  revokeRefreshTokenByHash(hashRefreshToken(refreshTokenValue));
}
