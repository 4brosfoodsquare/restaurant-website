import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  description: z.string().trim().max(2000).default(''),
  imageUrl: z.string().trim().url('Must be a valid URL.').max(500).nullable().default(null),
  isSignature: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

export const reorderCategoriesSchema = z.object({
  order: z.array(z.number().int().positive()).min(1),
});
