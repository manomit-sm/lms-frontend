import { describe, expect, it, vi } from 'vitest';
import { createTenantApi } from './client';
import { ApiError } from './problem';

function apiWith(fetchImpl: (request: Request) => Promise<Response>, token: string | null = 'token-1') {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal('fetch', fetchMock);
  const onUnauthorized = vi.fn();
  const api = createTenantApi({ baseUrl: 'http://lms.test', getAccessToken: () => token, onUnauthorized });
  return { api, fetchMock, onUnauthorized };
}

const json = (status: number, body: object, contentType = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': contentType } });

describe('tenant API client', () => {
  it('sends the access token and returns the data', async () => {
    const { api, fetchMock } = apiWith(async () => json(200, { email: 'asha@acme.test' }));

    const { data } = await api.client.GET('/api/v1/auth/me');

    expect(data?.email).toBe('asha@acme.test');
    const request = fetchMock.mock.calls[0]![0];
    expect(request.url).toBe('http://lms.test/api/v1/auth/me');
    expect(request.headers.get('Authorization')).toBe('Bearer token-1');
  });

  it('sends paging as page and size query parameters', async () => {
    const { api, fetchMock } = apiWith(async () => json(200, { content: [] }));

    await api.client.GET('/api/v1/users', { params: { query: { page: 2, size: 50 } } });

    expect(new URL(fetchMock.mock.calls[0]![0].url).search).toBe('?page=2&size=50');
  });

  it('ends the session on 401 and rejects with the problem', async () => {
    const { api, onUnauthorized } = apiWith(async () =>
      json(401, { errorCode: 'UNAUTHENTICATED', detail: 'Sign in again' }, 'application/problem+json'),
    );

    const call = api.client.GET('/api/v1/auth/me');

    await expect(call).rejects.toBeInstanceOf(ApiError);
    await expect(call).rejects.toMatchObject({ status: 401, errorCode: 'UNAUTHENTICATED' });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('rejects other errors without ending the session', async () => {
    const { api, onUnauthorized } = apiWith(async () =>
      json(403, { errorCode: 'ACCESS_DENIED', detail: 'Not allowed' }, 'application/problem+json'),
    );

    await expect(api.client.GET('/api/v1/audit-logs')).rejects.toMatchObject({ errorCode: 'ACCESS_DENIED' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('turns a network failure into NETWORK_ERROR', async () => {
    const { api } = apiWith(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(api.client.GET('/api/v1/auth/me')).rejects.toMatchObject({
      errorCode: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it('sends no Authorization header when signed out', async () => {
    const { api, fetchMock } = apiWith(async () => json(200, {}), null);

    await api.client.GET('/api/v1/auth/me');

    expect(fetchMock.mock.calls[0]![0].headers.has('Authorization')).toBe(false);
  });
});
