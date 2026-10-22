import type { TenantSchemas } from '@lms/api';

type Employee = TenantSchemas['schemas']['EmployeeResponse'];

export type EmploymentStatus = NonNullable<Employee['employmentStatus']>;
export type EmploymentType = NonNullable<Employee['employmentType']>;

export const EMPLOYMENT_STATUS: Record<EmploymentStatus, { label: string; color: string }> = {
  PROBATION: { label: 'Probation', color: 'blue' },
  ACTIVE: { label: 'Active', color: 'teal' },
  NOTICE_PERIOD: { label: 'Notice period', color: 'orange' },
  INACTIVE: { label: 'Inactive', color: 'gray' },
  EXITED: { label: 'Exited', color: 'gray' },
};

export const EMPLOYMENT_TYPE: Record<EmploymentType, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};
