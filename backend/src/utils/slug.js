import { slugify } from './ids.js';

/**
 * Generates a slug from `name`, appending "-2", "-3", ... until `exists()`
 * (given a candidate slug) returns falsy. `exists` should ignore `excludeId`
 * so renaming a record to its own current name doesn't collide with itself.
 */
export function uniqueSlug(name, exists) {
  const base = slugify(name) || 'item';
  let candidate = base;
  let suffix = 2;
  while (exists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
