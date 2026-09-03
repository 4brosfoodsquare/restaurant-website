import { getDb } from '../../db/index.js';
import { boolify, boolifyAll } from '../../utils/serialize.js';

const USER_COLUMNS = `
  users.id, users.email, users.name, users.is_active AS isActive,
  users.last_login_at AS lastLoginAt, users.created_at AS createdAt,
  roles.key AS role
`;
const JOIN_ROLE = 'FROM users JOIN roles ON roles.id = users.role_id';
const BOOLEAN_KEYS = ['isActive'];

export function listUsers() {
  return boolifyAll(getDb().prepare(`SELECT ${USER_COLUMNS} ${JOIN_ROLE} ORDER BY users.created_at ASC`).all(), BOOLEAN_KEYS);
}

export function findUserByIdWithRole(id) {
  return boolify(getDb().prepare(`SELECT ${USER_COLUMNS} ${JOIN_ROLE} WHERE users.id = ?`).get(id), BOOLEAN_KEYS);
}

export function findUserByEmailNorm(email) {
  return getDb().prepare('SELECT id FROM users WHERE email_norm = ?').get(email.toLowerCase());
}

export function findRoleIdByKey(key) {
  return getDb().prepare('SELECT id FROM roles WHERE key = ?').get(key)?.id ?? null;
}

export function countActiveOwners() {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM users JOIN roles ON roles.id = users.role_id
       WHERE roles.key = 'owner' AND users.is_active = 1`,
    )
    .get().count;
}

export function insertUser({ email, name, passwordHash, roleId }) {
  const result = getDb()
    .prepare(
      `INSERT INTO users (email, email_norm, name, password_hash, role_id) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(email, email.toLowerCase(), name, passwordHash, roleId);
  return findUserByIdWithRole(result.lastInsertRowid);
}

export function updateUserFields(id, { name, roleId }) {
  const sets = [];
  const values = [];
  if (name !== undefined) { sets.push('name = ?'); values.push(name); }
  if (roleId !== undefined) { sets.push('role_id = ?'); values.push(roleId); }
  if (sets.length === 0) return findUserByIdWithRole(id);

  sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);
  values.push(id);
  getDb().prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return findUserByIdWithRole(id);
}

export function setUserActive(id, isActive) {
  getDb()
    .prepare(`UPDATE users SET is_active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
    .run(isActive ? 1 : 0, id);
  return findUserByIdWithRole(id);
}

export function setUserPasswordHash(id, passwordHash) {
  getDb()
    .prepare(`UPDATE users SET password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
    .run(passwordHash, id);
}

export function getUserPasswordHash(id) {
  return getDb().prepare('SELECT password_hash AS passwordHash FROM users WHERE id = ?').get(id)?.passwordHash;
}
