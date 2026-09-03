import { getDb } from '../../db/index.js';
import { boolify, boolifyAll } from '../../utils/serialize.js';

const CATEGORY_COLUMNS = `
  id, slug, name, description, image_url AS imageUrl, is_signature AS isSignature,
  is_active AS isActive, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
`;
const BOOLEAN_KEYS = ['isSignature', 'isActive'];

export function listActiveCategories() {
  return boolifyAll(
    getDb()
      .prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`)
      .all(),
    BOOLEAN_KEYS,
  );
}

export function listAllCategories() {
  return boolifyAll(
    getDb().prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories ORDER BY sort_order ASC, name ASC`).all(),
    BOOLEAN_KEYS,
  );
}

export function findCategoryById(id) {
  return boolify(getDb().prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ?`).get(id), BOOLEAN_KEYS);
}

export function findCategoryBySlug(slug) {
  return boolify(getDb().prepare(`SELECT ${CATEGORY_COLUMNS} FROM categories WHERE slug = ?`).get(slug), BOOLEAN_KEYS);
}

export function insertCategory({ slug, name, description, imageUrl, isSignature, sortOrder }) {
  const result = getDb()
    .prepare(
      `INSERT INTO categories (slug, name, description, image_url, is_signature, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(slug, name, description, imageUrl, isSignature ? 1 : 0, sortOrder);
  return findCategoryById(result.lastInsertRowid);
}

export function updateCategory(id, fields) {
  const columnMap = {
    name: 'name',
    description: 'description',
    imageUrl: 'image_url',
    isSignature: 'is_signature',
    sortOrder: 'sort_order',
    slug: 'slug',
  };

  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (!(key in fields)) continue;
    sets.push(`${column} = ?`);
    values.push(key === 'isSignature' ? (fields[key] ? 1 : 0) : fields[key]);
  }
  if (sets.length === 0) return findCategoryById(id);

  sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);
  values.push(id);
  getDb().prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return findCategoryById(id);
}

export function setCategoryActive(id, isActive) {
  getDb()
    .prepare(`UPDATE categories SET is_active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
    .run(isActive ? 1 : 0, id);
  return findCategoryById(id);
}

export function reorderCategories(orderedIds) {
  const db = getDb();
  const update = db.prepare(`UPDATE categories SET sort_order = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`);
  db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id));
  })();
  return listAllCategories();
}

export function countMenuItemsInCategory(id) {
  return getDb().prepare('SELECT COUNT(*) AS count FROM menu_items WHERE category_id = ? AND is_active = 1').get(id).count;
}
