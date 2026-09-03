import config from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'This endpoint does not exist.' },
  });
}

/**
 * Central error handler — must be registered last, after all routes.
 * Express 5 forwards rejected promises from async handlers here automatically.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    if (err.status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Unexpected error: log full detail server-side, never leak it to the client.
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end. Please try again.',
      ...(config.isDevelopment ? { details: { message: err.message } } : {}),
    },
  });
}
