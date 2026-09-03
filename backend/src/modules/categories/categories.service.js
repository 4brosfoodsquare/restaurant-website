import { uniqueSlug } from '../../utils/slug.js';
import { notFound, conflict } from '../../utils/httpError.js';
import * as repo from './categories.repository.js';

function nextCategorySlug(name, { excludeId } = {}) {
  return uniqueSlug(name, (candidate) => {
    const existing = repo.findCategoryBySlug(candidate);
    return existing && existing.id !== excludeId;
  });
}

export function listPublicCategories() {
  return repo.listActiveCategories();
}

export function listAllCategoriesForAdmin() {
  return repo.listAllCategories();
}

export function getCategoryOrThrow(id) {
  const category = repo.findCategoryById(id);
  if (!category) throw notFound('Category not found.');
  return category;
}

export function createCategory(input) {
  const slug = nextCategorySlug(input.name);
  return repo.insertCategory({ ...input, slug });
}

export function updateCategory(id, input) {
  getCategoryOrThrow(id);
  const patch = { ...input };
  if (typeof input.name === 'string') {
    patch.slug = nextCategorySlug(input.name, { excludeId: id });
  }
  return repo.updateCategory(id, patch);
}

export function setCategoryActive(id, isActive) {
  const category = getCategoryOrThrow(id);
  if (!isActive && repo.countMenuItemsInCategory(category.id) > 0) {
    // Not blocked — deactivating a category also hides its items from the
    // public menu (the menu query joins on categories.is_active). We only
    // surface this so the admin isn't surprised those dishes just vanished.
  }
  return repo.setCategoryActive(id, isActive);
}

export function reorderCategories(orderedIds) {
  const all = repo.listAllCategories();
  const allIds = new Set(all.map((c) => c.id));
  const missing = orderedIds.filter((id) => !allIds.has(id));
  if (missing.length > 0) {
    throw conflict('Reorder list contains unknown category ids.', { details: { missing } });
  }
  return repo.reorderCategories(orderedIds);
}
