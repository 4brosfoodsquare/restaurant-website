import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { recordAudit } from '../../utils/auditLog.js';
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  setAvailabilitySchema,
  setActiveSchema,
  publicMenuQuerySchema,
  adminMenuQuerySchema,
} from './menu.schemas.js';
import * as service from './menu.service.js';

/** Public router — mounted at /api/menu. */
export const publicMenuRouter = Router();

publicMenuRouter.get('/', validate(publicMenuQuerySchema, 'query'), (req, res) => {
  res.json({ data: service.listPublicItems(req.validated.query) });
});

publicMenuRouter.get('/:slug', (req, res) => {
  res.json({ data: service.getPublicItemBySlugOrThrow(req.params.slug) });
});

/** Admin router — mounted at /api/admin/menu, all routes require auth. */
export const adminMenuRouter = Router();
adminMenuRouter.use(requireAuth);

const canEdit = requireRole('owner', 'admin');
// Availability is a fast operational toggle ("we're out of X today") — any
// authenticated staff member can flip it; full edits need owner/admin.
const canToggleAvailability = requireRole('owner', 'admin', 'staff');

adminMenuRouter.get('/', validate(adminMenuQuerySchema, 'query'), (req, res) => {
  res.json({ data: service.listAdminItems(req.validated.query) });
});

adminMenuRouter.get('/:id', (req, res) => {
  res.json({ data: service.getItemOrThrow(Number(req.params.id)) });
});

adminMenuRouter.post('/', canEdit, validate(createMenuItemSchema), (req, res) => {
  const item = service.createItem(req.body);
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'create', entity: 'menu_item', entityId: item.id, ip: req.ip });
  res.status(201).json({ data: item });
});

adminMenuRouter.patch('/:id', canEdit, validate(updateMenuItemSchema), (req, res) => {
  const item = service.updateItem(Number(req.params.id), req.body);
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'update', entity: 'menu_item', entityId: item.id, ip: req.ip });
  res.json({ data: item });
});

adminMenuRouter.patch('/:id/availability', canToggleAvailability, validate(setAvailabilitySchema), (req, res) => {
  const item = service.setAvailability(Number(req.params.id), req.body.isAvailable);
  recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: req.body.isAvailable ? 'mark_available' : 'mark_unavailable',
    entity: 'menu_item',
    entityId: item.id,
    ip: req.ip,
  });
  res.json({ data: item });
});

adminMenuRouter.patch('/:id/active', canEdit, validate(setActiveSchema), (req, res) => {
  const item = service.setActive(Number(req.params.id), req.body.isActive);
  recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: req.body.isActive ? 'activate' : 'deactivate',
    entity: 'menu_item',
    entityId: item.id,
    ip: req.ip,
  });
  res.json({ data: item });
});
