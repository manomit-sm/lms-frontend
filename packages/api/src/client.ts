import createFetchClient, { type Middleware } from 'openapi-fetch';
import createQueryHooks from 'openapi-react-query';
import type { paths as PlatformPaths } from './generated/platform';
import type { paths as TenantPaths } from './generated/tenant';
import { ApiError } from './problem';

export interface ApiClientOptions {
  /** Empty for the portal's own origin (the dev proxy, or the same CloudFront distribution). */
  baseUrl: string;
  /** The current access token, or null when signed out. */
  getAccessToken: () => string | null;
  /** Called on 401: the token expired or was revoked, so the session is over. */
  onUnauthorized: () => void;
}

/** Adds the bearer token, and turns every non-2xx response or network failure into an {@link ApiError}. */
export function authMiddleware(options: ApiClientOptions): Middleware {
  return {
    onRequest({ request }) {
      const token = options.getAccessToken();
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },
    async onResponse({ response }) {
      if (response.ok) {
        return response;
      }
      if (response.status === 401) {
        options.onUnauthorized();
      }
      throw await ApiError.fromResponse(response);
    },
    onError({ error }) {
      return error instanceof ApiError ? error : ApiError.network(error);
    },
  };
}

function createApi<Paths extends object>(options: ApiClientOptions) {
  const client = createFetchClient<Paths>({ baseUrl: options.baseUrl });
  client.use(authMiddleware(options));
  return {
    /** Plain calls: `await api.client.POST(...)`; failures reject with ApiError. */
    client,
    /** TanStack Query hooks: `api.query.useQuery('get', '/api/v1/auth/me')`. */
    query: createQueryHooks(client),
  };
}

/** The tenant API (`/api/v1/**`), used by the employee and admin portals. */
export function createTenantApi(options: ApiClientOptions) {
  return createApi<TenantPaths>(options);
}

/** The platform API (`/platform/**`), used by the platform portal. */
export function createPlatformApi(options: ApiClientOptions) {
  return createApi<PlatformPaths>(options);
}

export type TenantApi = ReturnType<typeof createTenantApi>;
export type PlatformApi = ReturnType<typeof createPlatformApi>;
