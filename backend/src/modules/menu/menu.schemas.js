import { z } from 'zod';

const dietTypeEnum = z.enum(['veg', 'non_veg', 'egg', 'unspecified']);

export const createMenuItemSchema = z.object({
  categoryId: z.number().int().positive('Choose a category.'),
  name: z.string().trim().min(1, 'Name is required.').max(150),
  description: z.string().trim().max(2000).default(''),
  priceMinor: z.number().int().min(0, 'Price cannot be negative.').max(100_000_00),
  imageUrl: z.string().trim().url('Must be a valid URL.').max(500).nullable().default(null),
  dietType: dietTypeEnum.default('unspecified'),
  spiceLevel: z.number().int().min(0).max(3).default(0),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const setAvailabilitySchema = z.object({ isAvailable: z.boolean() });
export const setActiveSchema = z.object({ isActive: z.boolean() });

export const publicMenuQuerySchema = z.object({
  category: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  diet: dietTypeEnum.optional(),
  featured: z.enum(['true', 'false']).optional(),
  popular: z.enum(['true', 'false']).optional(),
});

export const adminMenuQuerySchema = z.object({
  category: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'active', 'inactive']).default('active'),
});
