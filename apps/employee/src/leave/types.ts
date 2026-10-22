import type { TenantSchemas } from '@lms/api';

type Schemas = TenantSchemas['schemas'];

export type LeaveRequestDetail = Schemas['LeaveRequestDetail'];
export type LeaveRequestSummary = Schemas['LeaveRequestSummary'];
export type Balance = Schemas['BalanceResponse'];
export type BalanceTransaction = Schemas['BalanceTransactionResponse'];
export type LeaveType = Schemas['LeaveTypeResponse'];
export type EffectivePolicy = Schemas['EffectivePolicyResponse'];
export type ResolvedPolicy = Schemas['ResolvedPolicy'];
export type PreviewResponse = Schemas['PreviewResponse'];
export type LeaveDay = Schemas['LeaveDayDto'];
export type ApprovalView = Schemas['ApprovalView'];
export type Activity = Schemas['ActivityResponse'];
export type PendingApproval = Schemas['PendingApprovalResponse'];
export type CalendarData = Schemas['CalendarResponse'];
export type CalendarLeave = Schemas['Leave'];
export type CalendarHoliday = Schemas['Holiday'];
export type CalendarMember = Schemas['Member'];
export type Availability = Schemas['AvailabilityResponse'];
export type EmployeeAvailability = Schemas['EmployeeAvailability'];
export type Employee = Schemas['EmployeeResponse'];
export type Notification = Schemas['NotificationResponse'];
