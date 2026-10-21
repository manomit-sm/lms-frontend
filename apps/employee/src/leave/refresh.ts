import type { QueryClient } from '@tanstack/react-query';

/** Everything a submitted, withdrawn or cancelled request changes. */
const LEAVE_DATA = [
  '/api/v1/leave-requests',
  '/api/v1/leave-requests/{requestId}',
  '/api/v1/balances',
  '/api/v1/balances/{balanceId}/transactions',
  '/api/v1/dashboard/summary',
  '/api/v1/dashboard/activities',
];

export function refreshLeaveData(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    LEAVE_DATA.map((path) => queryClient.invalidateQueries({ queryKey: ['get', path] })),
  ).then(() => undefined);
}
