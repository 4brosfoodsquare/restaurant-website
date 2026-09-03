import { getDb } from '../../db/index.js';

const ITEM_COLUMNS = `
  menu_items.id, menu_items.slug, menu_items.name, menu_items.description,
  menu_items.price_minor AS priceMinor, menu_items.image_url AS imageUrl,
  menu_items.diet_type AS dietType, menu_items.spice_level AS spiceLevel,
  menu_items.is_available AS isAvailable, menu_items.is_active AS isActive,
  menu_items.is_featured AS isFeatured, menu_items.is_popular AS isPopular,
  menu_items.sort_order AS sortOrder,
  menu_items.created_at AS createdAt, menu_items.updated_at AS updatedAt,
  menu_items.category_id AS categoryId,
  categories.slug AS categorySlug, categories.name AS categoryName,
  categories.is_signature AS categoryIsSignature, categories.is_active AS categoryIsActive
`;

const JOIN_CATEGORY = 'FROM menu_items JOIN categories ON categories.id = menu_items.category_id';

function likeParam(value) {
  return `%${value.replace(/[%_]/g, (c) => `\\${c}`)}%`;
}

export function listPublicItems({ categorySlug, dietType, search, featured, popular } = {}) {
  // Intentionally does not filter on is_available: a sold-out dish should
  // still be visible (shown as "unavailable"), not vanish from the menu.
  // Availability is enforced for real when an order is placed, not here.
  const clauses = ['menu_items.is_active = 1', 'categories.is_active = 1'];
  const params = [];

  if (categorySlug) {
    clauses.push('categories.slug = ?');
    params.push(categorySlug);
  }
  if (dietType) {
    clauses.push('menu_items.diet_type = ?');
    params.push(dietType);
  }
  if (search) {
    clauses.push("(menu_items.name LIKE ? ESCAPE '\\' OR menu_items.description LIKE ? ESCAPE '\\')");
    params.push(likeParam(search), likeParam(search));
  }
  if (featured !== undefined) {
    clauses.push('menu_items.is_featured = ?');
    params.push(featured ? 1 : 0);
  }
  if (popular !== undefined) {
    clauses.push('menu_items.is_popular = ?');
    params.push(popular ? 1 : 0);
  }

  const sql = `
    SELECT ${ITEM_COLUMNS} ${JOIN_CATEGORY}
    WHERE ${clauses.join(' AND ')}
    ORDER BY categories.sort_order ASC, menu_items.sort_order ASC, menu_items.name ASC
  `;
  return getDb().prepare(sql).all(...params);
}

export function listAdminItems({ categorySlug, search, status = 'active' } = {}) {
  const clauses = [];
  const params = [];

  if (status === 'active') clauses.push('menu_items.is_active = 1');
  if (status === 'inactive') clauses.push('menu_items.is_active = 0');

  if (categorySlug) {
    clauses.push('categories.slug = ?');
    params.push(categorySlug);
  }
  if (search) {
    clauses.push("(menu_items.name LIKE ? ESCAPE '\\' OR menu_items.description LIKE ? ESCAPE '\\')");
    params.push(likeParam(search), likeParam(search));
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT ${ITEM_COLUMNS} ${JOIN_CATEGORY}
    ${where}
    ORDER BY categories.sort_order ASC, menu_items.sort_order ASC, menu_items.name ASC
  `;
  return getDb().prepare(sql).all(...params);
}

export function findItemById(id) {
  return getDb().prepare(`SELECT ${ITEM_COLUMNS} ${JOIN_CATEGORY} WHERE menu_items.id = ?`).get(id);
}

export function findItemBySlug(slug) {
  return getDb().prepare(`SELECT ${ITEM_COLUMNS} ${JOIN_CATEGORY} WHERE menu_items.slug = ?`).get(slug);
}

export function findItemBySlugRaw(slug) {
  return getDb().prepare('SELECT id FROM menu_items WHERE slug = ?').get(slug);
}

export function insertItem({ categoryId, slug, name, description, priceMinor, imageUrl, dietType, spiceLevel, isFeatured, isPopular, isAvailable, sortOrder }) {
  const result = getDb()
    .prepare(
      `INSERT INTO menu_items
         (category_id, slug, name, description, price_minor, image_url, diet_type, spice_level,
          is_featured, is_popular, is_available, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      categoryId, slug, name, description, priceMinor, imageUrl, dietType, spiceLevel,
      isFeatured ? 1 : 0, isPopular ? 1 : 0, isAvailable === false ? 0 : 1, sortOrder,
    );
  return findItemById(result.lastInsertRowid);
}

const UPDATABLE_COLUMNS = {
  categoryId: 'category_id',
  slug: 'slug',
  name: 'name',
  description: 'description',
  priceMinor: 'price_minor',
  imageUrl: 'image_url',
  dietType: 'diet_type',
  spiceLevel: 'spice_level',
  isFeatured: 'is_featured',
  isPopular: 'is_popular',
  isAvailable: 'is_available',
  sortOrder: 'sort_order',
};
const BOOLEAN_KEYS = new Set(['isFeatured', 'isPopular', 'isAvailable']);

export function updateItem(id, fields) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (!(key in fields)) continue;
    sets.push(`${column} = ?`);
    values.push(BOOLEAN_KEYS.has(key) ? (fields[key] ? 1 : 0) : fields[key]);
  }
  if (sets.length === 0) return findItemById(id);

  sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);
  values.push(id);
  getDb().prepare(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return findItemById(id);
}

export function setItemAvailability(id, isAvailable) {
  getDb()
    .prepare(`UPDATE menu_items SET is_available = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
    .run(isAvailable ? 1 : 0, id);
  return findItemById(id);
}

export function setItemActive(id, isActive) {
  getDb()
    .prepare(`UPDATE menu_items SET is_active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`)
    .run(isActive ? 1 : 0, id);
  return findItemById(id);
}

export function findManyByIds(ids) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  return getDb().prepare(`SELECT ${ITEM_COLUMNS} ${JOIN_CATEGORY} WHERE menu_items.id IN (${placeholders})`).all(...ids);
}
