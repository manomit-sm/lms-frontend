import type { EmployeeAvailability } from '../leave/types';

export type AvailabilityStatus = NonNullable<EmployeeAvailability['status']>;

export const AVAILABILITY: Record<AvailabilityStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'teal' },
  REMOTE: { label: 'Working remotely', color: 'blue' },
  HALF_DAY_LEAVE: { label: 'Half day off', color: 'yellow' },
  ON_LEAVE: { label: 'On leave', color: 'orange' },
  HOLIDAY: { label: 'Holiday', color: 'grape' },
  NON_WORKING_DAY: { label: 'Not a working day', color: 'gray' },
};

/** Display order: who is in first. */
export const AVAILABILITY_ORDER: AvailabilityStatus[] = [
  'AVAILABLE',
  'REMOTE',
  'HALF_DAY_LEAVE',
  'ON_LEAVE',
  'HOLIDAY',
  'NON_WORKING_DAY',
];
