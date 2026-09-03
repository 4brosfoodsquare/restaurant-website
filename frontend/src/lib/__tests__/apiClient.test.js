import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * apiClient.js keeps module-level mutable state (the in-memory access token,
 * the single-flight refresh promise), so each test gets a fresh module
 * instance via resetModules + a dynamic import — otherwise state would leak
 * between tests.
 */
async function freshApiClient() {
  vi.resetModules();
  return import('../apiClient.js');
}

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] },
    json: async () => body,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('refreshAccessToken', () => {
  it('de-dupes concurrent callers into a single in-flight request (regression test for the session-loss bug)', async () => {
    const { refreshAccessToken } = await freshApiClient();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { accessToken: 'tok-1', user: { id: 1, name: 'Owner' } } }),
    );
    global.fetch = fetchMock;

    // Two callers ask for a refresh "at the same time" (before either settles) —
    // this is exactly the shape of React StrictMode's double-effect-invocation.
    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ accessToken: 'tok-1', user: { id: 1, name: 'Owner' } });
    expect(b).toBe(a);
  });

  it('a fresh refresh call after the first has settled fires a new request', async () => {
    const { refreshAccessToken } = await freshApiClient();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: { accessToken: 'tok-1', user: { id: 1 } } }),
    );
    global.fetch = fetchMock;

    await refreshAccessToken();
    await refreshAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null on a failed refresh without throwing', async () => {
    const { refreshAccessToken } = await freshApiClient();
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'no' } }));

    const result = await refreshAccessToken();
    expect(result).toBeNull();
  });
});

describe('api request wrapper', () => {
  it('unwraps the { data } envelope on success', async () => {
    const { api } = await freshApiClient();
    global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: { id: 5, name: 'Test' } }));

    const result = await api.get('/api/menu/5');
    expect(result).toEqual({ id: 5, name: 'Test' });
  });

  it('throws ApiError with code/message/details on failure', async () => {
    const { api, ApiError } = await freshApiClient();
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(422, { error: { code: 'VALIDATION_ERROR', message: 'Bad input', details: { fieldErrors: { name: ['Required'] } } } }),
    );

    await expect(api.post('/api/admin/menu', {})).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Bad input',
    });
    await expect(api.post('/api/admin/menu', {})).rejects.toBeInstanceOf(ApiError);
  });

  it('on a 401, silently refreshes and retries the original request once', async () => {
    const { api, setAccessToken } = await freshApiClient();
    setAccessToken('expired-token');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } })) // original request
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'new-token', user: { id: 1 } } })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } })); // retried request
    global.fetch = fetchMock;

    const result = await api.get('/api/admin/orders');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // The retried request must carry the NEW token, not the expired one.
    const retryCall = fetchMock.mock.calls[2];
    expect(retryCall[1].headers.Authorization).toBe('Bearer new-token');
  });

  it('does not attempt a refresh loop when the auth endpoint itself returns 401', async () => {
    const { api } = await freshApiClient();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'nope' } }));
    global.fetch = fetchMock;

    await expect(api.post('/api/auth/login', { email: 'x', password: 'y' })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends FormData bodies without a Content-Type header (browser sets the multipart boundary)', async () => {
    const { api } = await freshApiClient();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { data: { url: '/uploads/x.png' } }));
    global.fetch = fetchMock;

    const form = new FormData();
    form.append('image', new Blob(['fake']), 'x.png');
    await api.post('/api/admin/uploads/image', form);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(options.body).toBe(form);
  });
});
