import { z } from 'zod';

const dayHoursSchema = z.string().trim().max(30); // "11:00-22:30" or "closed"

export const updateSettingsSchema = z.object({
  restaurantName: z.string().trim().min(1).max(150).optional(),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  addressPostcode: z.string().trim().max(20).optional(),
  hours: z
    .object({
      mon: dayHoursSchema, tue: dayHoursSchema, wed: dayHoursSchema, thu: dayHoursSchema,
      fri: dayHoursSchema, sat: dayHoursSchema, sun: dayHoursSchema,
    })
    .partial()
    .optional(),
  orderTypesEnabled: z.array(z.enum(['pickup', 'delivery'])).min(1).optional(),
  deliveryFeeMinor: z.number().int().min(0).max(100_000_00).optional(),
  taxRateBps: z.number().int().min(0).max(10_000).optional(),
  minOrderMinor: z.number().int().min(0).max(100_000_00).optional(),
  socialInstagram: z.string().trim().max(300).optional(),
  socialFacebook: z.string().trim().max(300).optional(),
});
