// Same-origin by default (dev: Vite's proxy forwards /api and /uploads to
// the backend; production: works as-is if the backend is reverse-proxied
// under the same domain as the built frontend). Set VITE_API_URL at build
// time to point at a separately-hosted backend instead (e.g. the frontend
// deployed on Netlify, the API on Render/Fly/Railway) — see docs/DEPLOYMENT.md.
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? '';

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** Registered once by the auth provider so a hard session loss can redirect to login. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise = null;

/**
 * The refresh token is single-use (rotated on every call): the server
 * revokes it the instant it's read, so two refresh requests racing each
 * other — React StrictMode's dev-only double-effect-invocation, a 401
 * auto-retry overlapping a mount-time silent refresh, whatever — means
 * whichever the server processes second gets a spurious 401, even though
 * the session was perfectly valid. The fix is a single in-flight promise
 * shared by every caller in this tab: everyone who asks for a refresh while
 * one is already pending gets the SAME promise instead of firing their own
 * request, so only one refresh call is ever actually in flight at a time.
 * Resolves with `{ user, accessToken }` on success, or null.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data?.accessToken) {
          setAccessToken(body.data.accessToken);
          return body.data;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Thin fetch wrapper: adds the bearer token, sends cookies for the refresh
 * flow, parses the API's `{ data }` / `{ error }` envelope, and transparently
 * retries once after a silent token refresh on a 401 (except on the auth
 * endpoints themselves, to avoid a refresh loop).
 */
async function request(path, { method = 'GET', body, headers, isRetry = false, ...rest } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    ...rest,
  });

  if (res.status === 401 && !isRetry && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, { method, body, headers, isRetry: true, ...rest });
    }
    onUnauthorized?.();
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const err = payload?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN_ERROR', err?.message ?? 'Something went wrong. Please try again.', err?.details);
  }

  return payload?.data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
