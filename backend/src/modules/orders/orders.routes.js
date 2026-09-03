import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { recordAudit } from '../../utils/auditLog.js';
import { createOrderSchema, updateOrderStatusSchema, adminOrdersQuerySchema, lookupOrderSchema } from './orders.schemas.js';
import * as service from './orders.service.js';

const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many orders placed. Please try again in a few minutes.' } },
});

// Guards against brute-forcing the (fairly short) order reference space.
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many lookup attempts. Please try again later.' } },
});

/** Public router — mounted at /api/orders. No customer authentication required (guest ordering). */
export const publicOrdersRouter = Router();

publicOrdersRouter.post('/', createOrderLimiter, validate(createOrderSchema), (req, res) => {
  const order = service.createOrder(req.body);
  res.status(201).json({ data: order });
});

publicOrdersRouter.get('/track/:token', (req, res) => {
  res.json({ data: service.getOrderByTrackingTokenOrThrow(req.params.token) });
});

publicOrdersRouter.post('/lookup', lookupLimiter, validate(lookupOrderSchema), (req, res) => {
  res.json({ data: service.lookupOrderOrThrow(req.body) });
});

/** Admin router — mounted at /api/admin/orders, all routes require auth. */
export const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAuth);

adminOrdersRouter.get('/', validate(adminOrdersQuerySchema, 'query'), (req, res) => {
  res.json({ data: service.listOrdersForAdmin(req.validated.query) });
});

adminOrdersRouter.get('/:id', (req, res) => {
  res.json({ data: service.getOrderForAdminOrThrow(Number(req.params.id)) });
});

// Any authenticated staff member can progress an order — this is the core
// operational task and must stay fast; owner/admin have no extra privilege
// here beyond what the state machine itself already restricts.
adminOrdersRouter.patch(
  '/:id/status',
  requireRole('owner', 'admin', 'staff'),
  validate(updateOrderStatusSchema),
  (req, res) => {
    const order = service.updateOrderStatus(Number(req.params.id), req.body, req.user);
    recordAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: `order_status:${req.body.status}`,
      entity: 'order',
      entityId: order.id,
      detail: req.body.note ?? '',
      ip: req.ip,
    });
    res.json({ data: order });
  },
);
