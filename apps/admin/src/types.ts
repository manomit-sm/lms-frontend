import type { TenantSchemas } from '@lms/api';

type Schemas = TenantSchemas['schemas'];

export type Department = Schemas['DepartmentResponse'];
export type Designation = Schemas['DesignationResponse'];
export type Location = Schemas['LocationResponse'];
export type WorkSchedule = Schemas['WorkScheduleResponse'];
export type Employee = Schemas['EmployeeResponse'];
export type EmployeeRequest = Schemas['EmployeeRequest'];
export type User = Schemas['UserResponse'];
export type Role = Schemas['RoleResponse'];
export type PermissionInfo = Schemas['PermissionResponse'];
export type WeekDay = NonNullable<WorkSchedule['workingDays']>[number];
export type LeaveType = Schemas['LeaveTypeResponse'];
export type LeavePolicy = Schemas['LeavePolicyResponse'];
export type LeavePolicyRequest = Schemas['LeavePolicyRequest'];
export type PolicyRule = Schemas['PolicyRule'];
export type LeavePeriod = Schemas['LeavePeriodResponse'];
export type Holiday = Schemas['HolidayResponse'];
export type Workflow = Schemas['WorkflowResponse'];
export type WorkflowRequest = Schemas['WorkflowRequest'];
export type WorkflowStep = Schemas['WorkflowStepDto'];
export type WorkflowRule = Schemas['WorkflowRuleDto'];
export type Settings = Schemas['SettingsResponse'];
export type Balance = Schemas['BalanceResponse'];
