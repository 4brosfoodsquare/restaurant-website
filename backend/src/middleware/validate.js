import { unprocessable } from '../utils/httpError.js';

/**
 * Validates `req[source]` against a zod schema, replacing it with the parsed
 * (and coerced/defaulted) value on success. This is the authoritative
 * validation layer — the frontend's own checks are only a UX convenience.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(unprocessable('Please check the submitted data.', {
        details: result.error.flatten(),
      }));
      return;
    }
    if (source === 'query' || source === 'params') {
      // In Express 5, req.query / req.params are getter-only accessors on
      // some setups — reassigning the property throws. Mutate the existing
      // object in place instead (it is itself a plain, writable object).
      const target = req[source];
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, result.data);
    } else {
      req[source] = result.data;
    }
    next();
  };
}
