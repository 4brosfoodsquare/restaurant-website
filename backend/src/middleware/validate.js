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
    req[source] = result.data;
    next();
  };
}
