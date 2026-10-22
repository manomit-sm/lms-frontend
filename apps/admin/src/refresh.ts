import type { QueryClient } from '@tanstack/react-query';

/** Refetches every query of the given API paths (any parameters). */
export function invalidate(queryClient: QueryClient, ...paths: string[]): Promise<void> {
  return Promise.all(paths.map((path) => queryClient.invalidateQueries({ queryKey: ['get', path] }))).then(
    () => undefined,
  );
}
