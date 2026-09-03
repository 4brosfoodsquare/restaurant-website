import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { recordAudit } from '../../utils/auditLog.js';
import { updateSettingsSchema } from './settings.schemas.js';
import * as service from './settings.service.js';

/** Public router — mounted at /api/settings. Read-only restaurant info for the customer site. */
export const publicSettingsRouter = Router();

publicSettingsRouter.get('/', (req, res) => {
  res.json({ data: service.getPublicSettings() });
});

/** Admin router — mounted at /api/admin/settings. */
export const adminSettingsRouter = Router();
adminSettingsRouter.use(requireAuth);

adminSettingsRouter.get('/', (req, res) => {
  res.json({ data: service.getAdminSettings() });
});

adminSettingsRouter.patch('/', requireRole('owner', 'admin'), validate(updateSettingsSchema), (req, res) => {
  const settings = service.updateSettings(req.body);
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'update', entity: 'settings', ip: req.ip });
  res.json({ data: settings });
});
