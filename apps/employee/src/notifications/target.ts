import type { Notification } from '../leave/types';

export type NotificationType = NonNullable<Notification['type']>;

const APPROVER_TYPES: ReadonlySet<NotificationType> = new Set([
  'APPROVAL_REQUESTED',
  'APPROVAL_REMINDER',
  'APPROVAL_ESCALATED',
]);

/** Whether a notification asks the reader to decide something (rather than telling them news). */
export function isForApprover(type: NotificationType | undefined): boolean {
  return type !== undefined && APPROVER_TYPES.has(type);
}

/** Where a notification leads in the employee portal, or null when it has nothing to open. */
export function notificationTarget(notification: Notification): string | null {
  if (notification.type === 'BALANCE_ADJUSTED') {
    return '/balances';
  }
  if (notification.subjectType !== 'LEAVE_REQUEST' || !notification.subjectId) {
    return null;
  }
  return isForApprover(notification.type)
    ? `/approvals/${notification.subjectId}`
    : `/leave/${notification.subjectId}`;
}
