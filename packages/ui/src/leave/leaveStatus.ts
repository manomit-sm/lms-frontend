import type { TenantSchemas } from '@lms/api';

export type LeaveStatus = NonNullable<TenantSchemas['schemas']['LeaveRequestSummary']['status']>;

export const LEAVE_STATUS: Record<LeaveStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'yellow' },
  APPROVED: { label: 'Approved', color: 'teal' },
  REJECTED: { label: 'Rejected', color: 'red' },
  WITHDRAWN: { label: 'Withdrawn', color: 'gray' },
  CANCELLATION_PENDING: { label: 'Cancellation pending', color: 'orange' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
};

export type DaySession = NonNullable<TenantSchemas['schemas']['LeaveApplicationRequest']['startSession']>;

export const SESSION_LABEL: Record<DaySession, string> = {
  FULL_DAY: 'Full day',
  FIRST_HALF: 'First half',
  SECOND_HALF: 'Second half',
};
