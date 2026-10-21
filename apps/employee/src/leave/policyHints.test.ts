import { describe, expect, it } from 'vitest';
import { policyHints } from './policyHints';

describe('policyHints', () => {
  it('puts the policy rules in plain words', () => {
    expect(
      policyHints(
        { halfDayAllowed: true },
        {
          minNoticeDays: 7,
          maxConsecutiveDays: 3,
          attachmentRequiredAfterDays: 2,
          negativeBalanceLimit: 0,
          allowedDuringProbation: false,
          sandwichRule: true,
        },
      ),
    ).toEqual([
      'Apply 7 days ahead',
      'At most 3 days per request',
      'A supporting document is needed for more than 2 days',
      'Half days allowed',
      'Weekends and holidays inside the request count as leave',
      'Not available during probation',
    ]);
  });

  it('uses the singular for one day', () => {
    expect(
      policyHints({ halfDayAllowed: false }, { minNoticeDays: 1, allowedDuringProbation: true }),
    ).toEqual(['Apply 1 day ahead', 'Whole days only']);
  });

  it('has nothing to say without a leave type', () => {
    expect(policyHints(undefined, undefined)).toEqual([]);
  });
});
