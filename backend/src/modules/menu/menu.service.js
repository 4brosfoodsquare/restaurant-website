import { uniqueSlug } from '../../utils/slug.js';
import { notFound, badRequest } from '../../utils/httpError.js';
import * as repo from './menu.repository.js';
import { findCategoryById } from '../categories/categories.repository.js';

function nextItemSlug(name, { excludeId } = {}) {
  return uniqueSlug(name, (candidate) => {
    const existing = repo.findItemBySlugRaw(candidate);
    return existing && existing.id !== excludeId;
  });
}

function assertCategoryExists(categoryId) {
  const category = findCategoryById(categoryId);
  if (!category) throw badRequest('Selected category does not exist.', { code: 'INVALID_CATEGORY' });
  return category;
}

function parseBoolParam(value) {
  if (value === undefined) return undefined;
  return value === 'true';
}

export function listPublicItems(query) {
  return repo.listPublicItems({
    categorySlug: query.category,
    dietType: query.diet,
    search: query.q,
    featured: parseBoolParam(query.featured),
    popular: parseBoolParam(query.popular),
  });
}

export function listAdminItems(query) {
  return repo.listAdminItems({ categorySlug: query.category, search: query.q, status: query.status });
}

export function getPublicItemBySlugOrThrow(slug) {
  const item = repo.findItemBySlug(slug);
  if (!item || !item.isActive) throw notFound('This dish could not be found.');
  return item;
}

export function getItemOrThrow(id) {
  const item = repo.findItemById(id);
  if (!item) throw notFound('Menu item not found.');
  return item;
}

export function createItem(input) {
  assertCategoryExists(input.categoryId);
  const slug = nextItemSlug(input.name);
  return repo.insertItem({ ...input, slug });
}

export function updateItem(id, input) {
  getItemOrThrow(id);
  if (input.categoryId !== undefined) assertCategoryExists(input.categoryId);

  const patch = { ...input };
  if (typeof input.name === 'string') {
    patch.slug = nextItemSlug(input.name, { excludeId: id });
  }
  return repo.updateItem(id, patch);
}

export function setAvailability(id, isAvailable) {
  getItemOrThrow(id);
  return repo.setItemAvailability(id, isAvailable);
}

export function setActive(id, isActive) {
  getItemOrThrow(id);
  return repo.setItemActive(id, isActive);
}
