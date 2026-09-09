import { z } from 'zod';

/**
 * Validation rules for a category, kept in one place so create and update
 * cannot drift apart. Deliberately carries no `.default()` values: defaults
 * belong to creation only.
 */
const categoryFields = {
  name: z.string().trim().min(1, 'Name is required.').max(100),
  description: z.string().trim().max(2000),
  imageUrl: z.string().trim().url('Must be a valid URL.').max(500).nullable(),
  isSignature: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
};

export const createCategorySchema = z.object({
  ...categoryFields,
  description: categoryFields.description.default(''),
  imageUrl: categoryFields.imageUrl.default(null),
  isSignature: categoryFields.isSignature.default(false),
  sortOrder: categoryFields.sortOrder.default(0),
});

/**
 * An update touches only the keys the caller actually sent. See the matching
 * note in menu.schemas.js: `.partial()` on a schema carrying defaults still
 * fills absent keys with those defaults, which silently erased stored values
 * on save.
 */
export const updateCategorySchema = z.object(
  Object.fromEntries(Object.entries(categoryFields).map(([key, rule]) => [key, rule.optional()])),
);

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

export const reorderCategoriesSchema = z.object({
  order: z.array(z.number().int().positive()).min(1),
});
