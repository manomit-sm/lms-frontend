/**
 * Permission codes, as in the backend's `Permissions` class. Screens check these (from `/auth/me`),
 * never role names: tenants can create custom roles with any mix of them.
 */
export const Permission = {
  ORGANIZATION_MANAGE: 'ORGANIZATION_MANAGE',
  EMPLOYEE_VIEW_ALL: 'EMPLOYEE_VIEW_ALL',
  EMPLOYEE_VIEW_TEAM: 'EMPLOYEE_VIEW_TEAM',
  EMPLOYEE_MANAGE: 'EMPLOYEE_MANAGE',
  USER_MANAGE: 'USER_MANAGE',
  ROLE_MANAGE: 'ROLE_MANAGE',
  LEAVE_APPLY: 'LEAVE_APPLY',
  LEAVE_APPROVE: 'LEAVE_APPROVE',
  LEAVE_MANAGE: 'LEAVE_MANAGE',
  LEAVE_POLICY_MANAGE: 'LEAVE_POLICY_MANAGE',
  BALANCE_ADJUST: 'BALANCE_ADJUST',
  HOLIDAY_MANAGE: 'HOLIDAY_MANAGE',
  WORKFLOW_MANAGE: 'WORKFLOW_MANAGE',
  REPORT_VIEW_TEAM: 'REPORT_VIEW_TEAM',
  REPORT_VIEW_ALL: 'REPORT_VIEW_ALL',
  REPORT_EXPORT: 'REPORT_EXPORT',
  SETTINGS_MANAGE: 'SETTINGS_MANAGE',
  AUDIT_VIEW: 'AUDIT_VIEW',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/** Any one of these opens the admin portal. */
export const ADMIN_PERMISSIONS: readonly Permission[] = [
  Permission.ORGANIZATION_MANAGE,
  Permission.EMPLOYEE_VIEW_ALL,
  Permission.EMPLOYEE_MANAGE,
  Permission.USER_MANAGE,
  Permission.ROLE_MANAGE,
  Permission.LEAVE_MANAGE,
  Permission.LEAVE_POLICY_MANAGE,
  Permission.BALANCE_ADJUST,
  Permission.HOLIDAY_MANAGE,
  Permission.WORKFLOW_MANAGE,
  Permission.REPORT_VIEW_ALL,
  Permission.SETTINGS_MANAGE,
  Permission.AUDIT_VIEW,
];
