import { unprocessable } from '../utils/httpError.js';

/**
 * Validates `req[source]` against a zod schema. For `body`, the parsed
 * (coerced/defaulted) value replaces `req.body` directly — Express gives us
 * a plain writable property there.
 *
 * `req.query` and `req.params` are different: in this Express version they
 * are getter-only accessors that recompute a brand-new object from the raw
 * URL on every single access, so neither reassigning them nor mutating the
 * object returned by one access has any lasting effect — the next read just
 * discards it. Route handlers must read validated query/params data from
 * `req.validated.<source>` instead of `req.query`/`req.params`.
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
      req.validated ??= {};
      req.validated[source] = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
}
