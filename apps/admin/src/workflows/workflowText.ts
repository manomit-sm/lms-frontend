import { formatAmount } from '@lms/ui';
import type { WorkflowRule, WorkflowStep } from '../types';

export type ApproverType = NonNullable<WorkflowStep['approverType']>;

export const APPROVER_TYPE: Record<ApproverType, string> = {
  REPORTING_MANAGER: 'Reporting manager',
  SKIP_LEVEL_MANAGER: 'Manager’s manager',
  ROLE: 'Anyone with a role',
  EMPLOYEE: 'A named employee',
};

/** "Annual Leave, 5 days or more"; "Any leave" for a rule without criteria. */
export function describeWorkflowRule(
  rule: WorkflowRule,
  leaveTypeName: (id: string) => string | undefined,
): string {
  const type = rule.leaveTypeId ? (leaveTypeName(rule.leaveTypeId) ?? 'Unknown leave type') : 'Any leave';
  return rule.minDays ? `${type}, ${formatAmount(rule.minDays)} days or more` : type;
}

/** "Reporting manager", "Role HR_ADMIN", "Maya Fernandes". */
export function describeStep(
  step: WorkflowStep,
  names: { role: (code: string) => string | undefined; employee: (id: string) => string | undefined },
): string {
  switch (step.approverType) {
    case 'ROLE':
      return step.roleCode ? `Anyone who is ${names.role(step.roleCode) ?? step.roleCode}` : 'A role';
    case 'EMPLOYEE':
      return step.employeeId ? (names.employee(step.employeeId) ?? 'A named employee') : 'A named employee';
    default:
      return step.approverType ? APPROVER_TYPE[step.approverType] : '';
  }
}

/** "12 h", "3 days" for the reminder, escalation and auto-approval delays. */
export function describeHours(hours: number | undefined): string | null {
  if (!hours) {
    return null;
  }
  return hours % 24 === 0 ? `${hours / 24} ${hours === 24 ? 'day' : 'days'}` : `${hours} h`;
}
