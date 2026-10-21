import { createLocalAuthApi, createTenantApi } from '@lms/api';
import { SessionStore } from '@lms/auth';
import { createQueryClient, requireEnv } from '@lms/ui';

/** The portal's single instances: settings, session, API clients and the query cache. */
export const config = {
  apiBaseUrl: requireEnv('VITE_API_BASE_URL'),
  adminPortalUrl: requireEnv('VITE_ADMIN_PORTAL_URL'),
};

export const sessionStore = new SessionStore('employee');

export const queryClient = createQueryClient();

export const api = createTenantApi({
  baseUrl: config.apiBaseUrl,
  getAccessToken: () => sessionStore.get()?.accessToken ?? null,
  onUnauthorized: () => sessionStore.clear(),
});

export const localAuthApi = createLocalAuthApi(config.apiBaseUrl);

// The next user must never see the previous one's cached data. Sign-in only happens signed out, so
// dropping the cache when a session ends (sign-out, expiry, 401) covers every change of user.
sessionStore.subscribe(() => {
  if (!sessionStore.get()) {
    queryClient.clear();
  }
});
