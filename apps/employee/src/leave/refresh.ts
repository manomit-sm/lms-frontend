import type { QueryClient } from '@tanstack/react-query';

/** Everything a submitted, withdrawn or cancelled request changes. */
const LEAVE_DATA = [
  '/api/v1/leave-requests',
  '/api/v1/leave-requests/{requestId}',
  '/api/v1/balances',
  '/api/v1/balances/{balanceId}/transactions',
  '/api/v1/dashboard/summary',
  '/api/v1/dashboard/activities',
  '/api/v1/calendar',
  '/api/v1/calendar/availability',
];

/** What an approver's decision, or a new task for them, changes on top of the leave itself. */
const APPROVAL_DATA = ['/api/v1/leave-requests/pending-approval', '/api/v1/approvals/tasks'];

function invalidate(queryClient: QueryClient, paths: string[]): Promise<void> {
  return Promise.all(paths.map((path) => queryClient.invalidateQueries({ queryKey: ['get', path] }))).then(
    () => undefined,
  );
}

export function refreshLeaveData(queryClient: QueryClient): Promise<void> {
  return invalidate(queryClient, LEAVE_DATA);
}

export function refreshApprovalData(queryClient: QueryClient): Promise<void> {
  return invalidate(queryClient, [...APPROVAL_DATA, ...LEAVE_DATA]);
}
