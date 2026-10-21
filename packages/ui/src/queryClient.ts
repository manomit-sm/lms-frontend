import { isApiError } from '@lms/api';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { showError } from './feedback/notify';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** The mutation shows its own error (e.g. field errors on a form): skip the global notification. */
      handlesError?: boolean;
    };
  }
}

/** Retries only what may succeed on a second try: network failures and 5xx, never other 4xx. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (!mutation.meta?.handlesError) {
          showError(error);
        }
      },
    }),
  });
}
