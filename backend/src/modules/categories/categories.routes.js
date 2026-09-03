import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { recordAudit } from '../../utils/auditLog.js';
import {
  createCategorySchema,
  updateCategorySchema,
  setActiveSchema,
  reorderCategoriesSchema,
} from './categories.schemas.js';
import * as service from './categories.service.js';

/** Public router — mounted at /api/categories. */
export const publicCategoriesRouter = Router();

publicCategoriesRouter.get('/', (req, res) => {
  res.json({ data: service.listPublicCategories() });
});

/** Admin router — mounted at /api/admin/categories, all routes require auth. */
export const adminCategoriesRouter = Router();
adminCategoriesRouter.use(requireAuth);

const canManage = requireRole('owner', 'admin');

adminCategoriesRouter.get('/', (req, res) => {
  res.json({ data: service.listAllCategoriesForAdmin() });
});

adminCategoriesRouter.get('/:id', (req, res) => {
  res.json({ data: service.getCategoryOrThrow(Number(req.params.id)) });
});

adminCategoriesRouter.post('/', canManage, validate(createCategorySchema), (req, res) => {
  const category = service.createCategory(req.body);
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'create', entity: 'category', entityId: category.id, ip: req.ip });
  res.status(201).json({ data: category });
});

adminCategoriesRouter.patch('/reorder', canManage, validate(reorderCategoriesSchema), (req, res) => {
  const categories = service.reorderCategories(req.body.order);
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'reorder', entity: 'category', ip: req.ip });
  res.json({ data: categories });
});

adminCategoriesRouter.patch('/:id', canManage, validate(updateCategorySchema), (req, res) => {
  const category = service.updateCategory(Number(req.params.id), req.body);
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'update', entity: 'category', entityId: category.id, ip: req.ip });
  res.json({ data: category });
});

adminCategoriesRouter.patch('/:id/active', canManage, validate(setActiveSchema), (req, res) => {
  const category = service.setCategoryActive(Number(req.params.id), req.body.isActive);
  recordAudit({
    actorId: req.user.id,
    actorEmail: req.user.email,
    action: req.body.isActive ? 'activate' : 'deactivate',
    entity: 'category',
    entityId: category.id,
    ip: req.ip,
  });
  res.json({ data: category });
});
