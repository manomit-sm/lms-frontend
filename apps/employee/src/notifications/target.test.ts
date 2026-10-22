import { describe, expect, it } from 'vitest';
import { isForApprover, notificationTarget } from './target';

describe('notificationTarget', () => {
  it('sends approvers to the review page', () => {
    expect(
      notificationTarget({ type: 'APPROVAL_REQUESTED', subjectType: 'LEAVE_REQUEST', subjectId: 'r1' }),
    ).toBe('/approvals/r1');
    expect(isForApprover('APPROVAL_ESCALATED')).toBe(true);
  });

  it('sends requesters to their request, and balance changes to balances', () => {
    expect(
      notificationTarget({ type: 'LEAVE_APPROVED', subjectType: 'LEAVE_REQUEST', subjectId: 'r1' }),
    ).toBe('/leave/r1');
    expect(notificationTarget({ type: 'BALANCE_ADJUSTED', subjectType: 'LEAVE_BALANCE' })).toBe('/balances');
  });

  it('opens nothing for subjects it does not know', () => {
    expect(
      notificationTarget({ type: 'LEAVE_APPROVED', subjectType: 'SOMETHING_ELSE', subjectId: 'x' }),
    ).toBeNull();
    expect(notificationTarget({ type: 'LEAVE_APPROVED', subjectType: 'LEAVE_REQUEST' })).toBeNull();
  });
});
