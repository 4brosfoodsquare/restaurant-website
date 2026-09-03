/**
 * Structured HTTP error. Thrown from anywhere in a route/service and turned
 * into a consistent `{ error: { code, message, details } }` JSON body by the
 * central error handler. Never expose internals (stack traces, SQL, etc.)
 * to the client — that happens only in server-side logs.
 */
export class HttpError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code ?? defaultCodeForStatus(status);
    this.details = details;
  }
}

function defaultCodeForStatus(status) {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMITED';
    default: return 'INTERNAL_ERROR';
  }
}

export const badRequest = (message, opts) => new HttpError(400, message, opts);
export const unauthorized = (message = 'Authentication required.', opts) => new HttpError(401, message, opts);
export const forbidden = (message = 'You do not have permission to do this.', opts) => new HttpError(403, message, opts);
export const notFound = (message = 'Not found.', opts) => new HttpError(404, message, opts);
export const conflict = (message, opts) => new HttpError(409, message, opts);
export const unprocessable = (message = 'Validation failed.', opts) => new HttpError(422, message, opts);
