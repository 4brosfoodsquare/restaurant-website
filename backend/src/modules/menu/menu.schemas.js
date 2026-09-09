import { z } from 'zod';

const dietTypeEnum = z.enum(['veg', 'non_veg', 'egg', 'unspecified']);

/**
 * Validation rules for a menu item, kept in one place so create and update
 * cannot drift apart. Deliberately carries no `.default()` values: defaults
 * belong to creation only.
 */
const menuItemFields = {
  categoryId: z.number().int().positive('Choose a category.'),
  name: z.string().trim().min(1, 'Name is required.').max(150),
  description: z.string().trim().max(2000),
  priceMinor: z.number().int().min(0, 'Price cannot be negative.').max(100_000_00),
  imageUrl: z.string().trim().url('Must be a valid URL.').max(500).nullable(),
  dietType: dietTypeEnum,
  spiceLevel: z.number().int().min(0).max(3),
  isFeatured: z.boolean(),
  isPopular: z.boolean(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
};

export const createMenuItemSchema = z.object({
  ...menuItemFields,
  description: menuItemFields.description.default(''),
  imageUrl: menuItemFields.imageUrl.default(null),
  dietType: menuItemFields.dietType.default('unspecified'),
  spiceLevel: menuItemFields.spiceLevel.default(0),
  isFeatured: menuItemFields.isFeatured.default(false),
  isPopular: menuItemFields.isPopular.default(false),
  isAvailable: menuItemFields.isAvailable.default(true),
  sortOrder: menuItemFields.sortOrder.default(0),
});

/**
 * An update touches only the keys the caller actually sent.
 *
 * This was previously `createMenuItemSchema.partial()`, which still applied
 * the creation defaults to absent keys — so saving a price in the admin form
 * silently blanked the dish's description and un-featured it, dropping it off
 * the homepage. Building from the default-free field list is what keeps an
 * omitted key omitted.
 */
export const updateMenuItemSchema = z.object(
  Object.fromEntries(Object.entries(menuItemFields).map(([key, rule]) => [key, rule.optional()])),
);

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
