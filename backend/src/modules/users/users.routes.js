import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { recordAudit } from '../../utils/auditLog.js';
import { createUserSchema, updateUserSchema, setUserActiveSchema, setPasswordSchema } from './users.schemas.js';
import * as service from './users.service.js';

/** Mounted at /api/admin/users. Staff cannot reach any of these routes. */
export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireRole('owner', 'admin'));

adminUsersRouter.get('/', (req, res) => {
  res.json({ data: service.listUsers() });
});

adminUsersRouter.get('/:id', (req, res) => {
  res.json({ data: service.getUserOrThrow(Number(req.params.id)) });
});

adminUsersRouter.post('/', validate(createUserSchema), async (req, res) => {
  const user = await service.createUser(req.body, { id: req.user.id, roleKey: req.user.roleKey });
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'create', entity: 'user', entityId: user.id, ip: req.ip });
  res.status(201).json({ data: user });
});

adminUsersRouter.patch('/:id', validate(updateUserSchema), (req, res) => {
  const user = service.updateUser(Number(req.params.id), req.body, { id: req.user.id, roleKey: req.user.roleKey });
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'update', entity: 'user', entityId: user.id, ip: req.ip });
  res.json({ data: user });
});

adminUsersRouter.patch('/:id/active', validate(setUserActiveSchema), (req, res) => {
  const user = service.setUserActive(Number(req.params.id), req.body.isActive, { id: req.user.id, roleKey: req.user.roleKey });
  recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: req.body.isActive ? 'activate' : 'deactivate',
    entity: 'user',
    entityId: user.id,
    ip: req.ip,
  });
  res.json({ data: user });
});

adminUsersRouter.patch('/:id/password', validate(setPasswordSchema), async (req, res) => {
  await service.setUserPassword(Number(req.params.id), req.body, { id: req.user.id, roleKey: req.user.roleKey });
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'set_password', entity: 'user', entityId: Number(req.params.id), ip: req.ip });
  res.status(204).end();
});
