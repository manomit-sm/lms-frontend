import { describe, expect, it } from 'vitest';
import { describeHours, describeStep, describeWorkflowRule } from './workflowText';

const names = {
  role: (code: string) => ({ HR_ADMIN: 'HR Admin' })[code],
  employee: (id: string) => ({ e1: 'Maya Fernandes' })[id],
};

describe('workflow text', () => {
  it('describes rules by leave type and length', () => {
    const leaveTypeName = (id: string) => ({ annual: 'Annual Leave' })[id];
    expect(describeWorkflowRule({ leaveTypeId: 'annual', minDays: 5 }, leaveTypeName)).toBe(
      'Annual Leave, 5 days or more',
    );
    expect(describeWorkflowRule({ minDays: 2.5 }, leaveTypeName)).toBe('Any leave, 2.5 days or more');
    expect(describeWorkflowRule({ leaveTypeId: 'annual' }, leaveTypeName)).toBe('Annual Leave');
  });

  it('names who approves each step', () => {
    expect(describeStep({ approverType: 'REPORTING_MANAGER' }, names)).toBe('Reporting manager');
    expect(describeStep({ approverType: 'ROLE', roleCode: 'HR_ADMIN' }, names)).toBe(
      'Anyone who is HR Admin',
    );
    expect(describeStep({ approverType: 'EMPLOYEE', employeeId: 'e1' }, names)).toBe('Maya Fernandes');
  });

  it('writes whole days as days, other delays in hours', () => {
    expect(describeHours(48)).toBe('2 days');
    expect(describeHours(24)).toBe('1 day');
    expect(describeHours(36)).toBe('36 h');
    expect(describeHours(undefined)).toBeNull();
  });
});
