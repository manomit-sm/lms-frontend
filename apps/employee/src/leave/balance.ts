import type { Balance, BalanceTransaction } from './types';

/** The parts of a balance as signed contributions, in the order they add up to "available" (LeaveBalance). */
export function breakdown(balance: Balance): { label: string; contribution: number }[] {
  return [
    { label: 'Allocated', contribution: balance.allocated ?? 0 },
    { label: 'Carried forward', contribution: balance.carriedForward ?? 0 },
    { label: 'Adjusted', contribution: balance.adjusted ?? 0 },
    { label: 'Expired', contribution: -(balance.expired ?? 0) },
    { label: 'Carried out', contribution: -(balance.carriedOut ?? 0) },
    { label: 'Used', contribution: -(balance.used ?? 0) },
    { label: 'Pending approval', contribution: -(balance.pending ?? 0) },
  ].filter((part, index) => index === 0 || part.contribution !== 0);
}

/**
 * What a ledger entry did to the available balance. Amounts are stored positive and the type gives the
 * direction (LeaveBalance.apply): a hold takes days, a release or reversal gives them back, and
 * consuming moves held days to used without changing what is available.
 */
export function availableChange(transaction: BalanceTransaction): number {
  const amount = transaction.amount ?? 0;
  switch (transaction.type) {
    case 'EXPIRY':
    case 'CARRY_OUT':
    case 'HOLD':
      return -amount;
    case 'CONSUME':
      return 0;
    default:
      return amount;
  }
}
