import type { LeaveType, ResolvedPolicy } from './types';

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** The rules of the user's policy for a leave type, in plain words, so they are known before applying. */
export function policyHints(type: LeaveType | undefined, policy: ResolvedPolicy | undefined): string[] {
  if (!type) {
    return [];
  }
  const hints: string[] = [];
  if (policy?.minNoticeDays) {
    hints.push(`Apply ${days(policy.minNoticeDays)} ahead`);
  }
  if (policy?.maxConsecutiveDays) {
    hints.push(`At most ${days(policy.maxConsecutiveDays)} per request`);
  }
  if (policy?.backdatingAllowedDays) {
    hints.push(`Can start up to ${days(policy.backdatingAllowedDays)} in the past`);
  }
  if (policy?.attachmentRequiredAfterDays != null) {
    hints.push(`A supporting document is needed for more than ${days(policy.attachmentRequiredAfterDays)}`);
  }
  hints.push(type.halfDayAllowed ? 'Half days allowed' : 'Whole days only');
  if (policy?.negativeBalanceLimit) {
    hints.push(`Balance may go ${days(policy.negativeBalanceLimit)} below zero`);
  }
  if (policy?.sandwichRule) {
    hints.push('Weekends and holidays inside the request count as leave');
  }
  if (policy && !policy.allowedDuringProbation) {
    hints.push('Not available during probation');
  }
  return hints;
}
