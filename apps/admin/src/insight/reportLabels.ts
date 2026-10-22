import type { TenantSchemas } from '@lms/api';

export type ReportName = TenantSchemas['schemas']['ExportRequest']['report'];

export const REPORT_LABEL: Record<ReportName, string> = {
  MONTHLY_STATISTICS: 'Monthly statistics',
  EMPLOYEE_LEAVE_HISTORY: 'Leave history',
  DEPARTMENT_USAGE: 'Department usage',
  LEAVE_TYPE_USAGE: 'Leave type usage',
  DECISIONS: 'Decisions',
  BALANCES: 'Balances',
};
