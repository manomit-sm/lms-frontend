import { Permission } from '@lms/api';

/** Who sees each admin area, used by the navigation and the route guards alike. */
export const AREA_PERMISSIONS = {
  employees: [Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_MANAGE],
  organisation: [Permission.ORGANIZATION_MANAGE],
  users: [Permission.USER_MANAGE],
  roles: [Permission.ROLE_MANAGE, Permission.USER_MANAGE],
  leaveSetup: [Permission.LEAVE_POLICY_MANAGE],
  holidays: [Permission.HOLIDAY_MANAGE],
  workflows: [Permission.WORKFLOW_MANAGE],
  balances: [Permission.BALANCE_ADJUST],
  settings: [Permission.SETTINGS_MANAGE],
  reports: [Permission.REPORT_VIEW_ALL, Permission.REPORT_VIEW_TEAM],
  audit: [Permission.AUDIT_VIEW],
} as const;
