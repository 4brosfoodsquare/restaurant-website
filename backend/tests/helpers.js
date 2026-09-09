import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

/**
 * Points DATABASE_FILE at a fresh throwaway SQLite file before any app module
 * is imported, so each test file gets an isolated database.
 */
export function useIsolatedDatabase() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fbfs-test-'));
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_FILE = path.join(dir, 'test.db');
  process.env.SEED_ADMIN_EMAIL = 'owner@example.com';
  process.env.SEED_ADMIN_PASSWORD = 'TestPassword!123';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
}

/**
 * Menu items for tests that need something orderable.
 *
 * The production seed deliberately ships no menu items — real dish names and
 * prices belong to the restaurant, not to this repo — so tests create their
 * own fixtures rather than leaning on demo rows. Covers the cases the suites
 * assert against: several items in one category, a vegetarian item, and a
 * name containing "Chilli" for the search test.
 */
export const TEST_MENU_ITEMS = [
  { slug: 'test-chicken-biriyani', name: 'Test Chicken Biriyani', category: 'biriyani', price: 24900, diet: 'non_veg', spice: 2 },
  { slug: 'test-mutton-biriyani', name: 'Test Mutton Biriyani', category: 'biriyani', price: 34900, diet: 'non_veg', spice: 2 },
  { slug: 'test-veg-biriyani', name: 'Test Veg Biriyani', category: 'biriyani', price: 19900, diet: 'veg', spice: 1 },
  { slug: 'test-seekh-kabab', name: 'Test Seekh Kabab', category: 'kabab', price: 21900, diet: 'non_veg', spice: 2 },
  { slug: 'test-paneer-kabab', name: 'Test Paneer Kabab', category: 'kabab', price: 18900, diet: 'veg', spice: 1 },
  { slug: 'test-chilli-chicken', name: 'Test Chilli Chicken', category: 'chilli-chicken', price: 22900, diet: 'non_veg', spice: 3 },
];

export function createTestMenuItems(db) {
  const categoryIdBySlug = Object.fromEntries(
    db.prepare('SELECT id, slug FROM categories').all().map((r) => [r.slug, r.id]),
  );
  const insert = db.prepare(
    `INSERT INTO menu_items
       (category_id, slug, name, description, price_minor, diet_type, spice_level, is_featured, is_popular)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
  );
  for (const item of TEST_MENU_ITEMS) {
    insert.run(
      categoryIdBySlug[item.category],
      item.slug,
      item.name,
      'Test fixture item.',
      item.price,
      item.diet,
      item.spice,
    );
  }
  return TEST_MENU_ITEMS.length;
}
