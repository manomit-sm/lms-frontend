import { ApiError } from './problem';

// The local-profile endpoints (/local/**) aren't in the OpenAPI documents: they exist only when the
// backend runs with its local token issuer, so their few types are written here.

export interface LocalTenant {
  id: string;
  key: string;
}

export interface LocalUser {
  id: string;
  email: string;
  /** What the token endpoint takes. */
  subject: string;
  status: 'INVITED' | 'ACTIVE' | 'DISABLED';
  roles: string[];
}

export interface LocalToken {
  accessToken: string;
  /** Seconds. */
  expiresIn: number;
}

/** The backend's local sign-in endpoints: who can sign in, and tokens with the same claims as Cognito's. */
export function createLocalAuthApi(baseUrl: string) {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, init);
    } catch (error) {
      throw ApiError.network(error);
    }
    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }
    return (await response.json()) as T;
  }

  const post = <T>(path: string, body: unknown) =>
    call<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  return {
    tenants: () => call<LocalTenant[]>('/local/directory/tenants'),
    users: (tenantId: string) =>
      call<LocalUser[]>(`/local/directory/tenants/${encodeURIComponent(tenantId)}/users`),
    tenantToken: (subject: string, tenantId: string, ttlMinutes: number) =>
      post<LocalToken>('/local/tokens/tenant', { subject, tenantId, ttlMinutes }),
    platformToken: (subject: string, ttlMinutes: number) =>
      post<LocalToken>('/local/tokens/platform', { subject, ttlMinutes }),
  };
}

export type LocalAuthApi = ReturnType<typeof createLocalAuthApi>;
