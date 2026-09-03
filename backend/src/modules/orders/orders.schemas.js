import { z } from 'zod';
import { ORDER_STATUSES } from './orderStatus.js';

const phoneRegex = /^[0-9+()\-.\s]{7,20}$/;

const orderItemInputSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1.').max(20, 'Quantity cannot exceed 20 per item.'),
});

const baseFields = {
  customerName: z.string().trim().min(1, 'Name is required.').max(120),
  customerPhone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number.').max(20),
  customerEmail: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  customerNotes: z.string().trim().max(500).default(''),
  scheduledFor: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
  items: z.array(orderItemInputSchema).min(1, 'Your cart is empty.').max(40, 'Too many distinct items in one order.'),
};

export const createOrderSchema = z.discriminatedUnion('orderType', [
  z.object({
    orderType: z.literal('pickup'),
    ...baseFields,
  }),
  z.object({
    orderType: z.literal('delivery'),
    ...baseFields,
    addressLine1: z.string().trim().min(1, 'Delivery address is required.').max(200),
    addressLine2: z.string().trim().max(200).default(''),
    addressCity: z.string().trim().min(1, 'City is required.').max(100),
    addressPostcode: z.string().trim().min(1, 'Postcode is required.').max(20),
    addressNotes: z.string().trim().max(300).default(''),
  }),
]);

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).default(''),
});

export const adminOrdersQuerySchema = z.object({
  status: z.enum([...ORDER_STATUSES, 'active']).optional(),
  orderType: z.enum(['pickup', 'delivery']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const lookupOrderSchema = z.object({
  reference: z.string().trim().min(1, 'Order reference is required.').max(20),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number.').max(20),
});
