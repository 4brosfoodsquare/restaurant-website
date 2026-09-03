import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../utils/httpError.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import * as repo from './users.repository.js';

/**
 * Role hierarchy for staff management (distinct from order/menu permissions):
 * an owner can manage anyone; an admin (manager) can only manage staff
 * accounts, never other admins or owners. Staff cannot reach this module
 * at all (blocked at the router).
 */
function assertCanManageRole(actorRoleKey, targetRoleKey) {
  if (actorRoleKey === 'owner') return;
  if (actorRoleKey === 'admin' && targetRoleKey === 'staff') return;
  throw forbidden('You do not have permission to manage this account.');
}

export function listUsers() {
  return repo.listUsers();
}

export function getUserOrThrow(id) {
  const user = repo.findUserByIdWithRole(id);
  if (!user) throw notFound('User not found.');
  return user;
}

export async function createUser(input, actingUser) {
  assertCanManageRole(actingUser.roleKey, input.role);

  if (repo.findUserByEmailNorm(input.email)) {
    throw conflict('An account with this email already exists.');
  }

  const roleId = repo.findRoleIdByKey(input.role);
  const passwordHash = await hashPassword(input.password);
  return repo.insertUser({ email: input.email, name: input.name, passwordHash, roleId });
}

export function updateUser(id, input, actingUser) {
  const target = getUserOrThrow(id);
  assertCanManageRole(actingUser.roleKey, target.role);
  if (input.role) assertCanManageRole(actingUser.roleKey, input.role);

  if (input.role && input.role !== 'owner' && target.role === 'owner' && repo.countActiveOwners() <= 1) {
    throw conflict('Cannot change the role of the last remaining owner.', { code: 'LAST_OWNER' });
  }

  const roleId = input.role ? repo.findRoleIdByKey(input.role) : undefined;
  return repo.updateUserFields(id, { name: input.name, roleId });
}

export function setUserActive(id, isActive, actingUser) {
  const target = getUserOrThrow(id);
  // Order matters: the last-owner and self-deactivation guards are checked
  // before the general role-management permission, so they produce their
  // specific, more useful error even for an actor who could not otherwise
  // manage this target's role (e.g. an admin deactivating themselves).
  if (!isActive && target.role === 'owner' && repo.countActiveOwners() <= 1) {
    throw conflict('Cannot deactivate the last remaining owner.', { code: 'LAST_OWNER' });
  }
  if (target.id === actingUser.id) {
    throw badRequest('You cannot deactivate your own account.');
  }
  assertCanManageRole(actingUser.roleKey, target.role);

  return repo.setUserActive(id, isActive);
}

/** Administrative password reset — no current-password check, gated by the usual role hierarchy. */
export async function setUserPassword(id, { password }, actingUser) {
  const target = getUserOrThrow(id);
  assertCanManageRole(actingUser.roleKey, target.role);

  const passwordHash = await hashPassword(password);
  repo.setUserPasswordHash(id, passwordHash);
}

/**
 * Self-service password change — available to any authenticated user
 * regardless of role (this is why it is not gated behind requireRole at the
 * router level; the current-password check is the only gate it needs).
 */
export async function changeOwnPassword(userId, { currentPassword, password }) {
  const existingHash = repo.getUserPasswordHash(userId);
  const currentOk = await verifyPassword(currentPassword, existingHash);
  if (!currentOk) throw unauthorized('Current password is incorrect.', { code: 'INVALID_CURRENT_PASSWORD' });

  const passwordHash = await hashPassword(password);
  repo.setUserPasswordHash(userId, passwordHash);
}
