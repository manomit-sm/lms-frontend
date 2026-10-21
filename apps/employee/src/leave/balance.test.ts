import { describe, expect, it } from 'vitest';
import { availableChange, breakdown } from './balance';

describe('breakdown', () => {
  it('lists what makes up the available balance, leaving out empty parts', () => {
    const parts = breakdown({
      allocated: 18,
      carriedForward: 2,
      adjusted: -1,
      used: 4.5,
      pending: 0.5,
      expired: 0,
    });

    expect(parts).toEqual([
      { label: 'Allocated', contribution: 18 },
      { label: 'Carried forward', contribution: 2 },
      { label: 'Adjusted', contribution: -1 },
      { label: 'Used', contribution: -4.5 },
      { label: 'Pending approval', contribution: -0.5 },
    ]);
    // the parts add up to "available", as the backend computes it
    expect(parts.reduce((sum, part) => sum + part.contribution, 0)).toBe(14);
  });

  it('always shows the allocation', () => {
    expect(breakdown({ allocated: 0 })).toEqual([{ label: 'Allocated', contribution: 0 }]);
  });
});

describe('availableChange', () => {
  it('follows the ledger: holds take days, consuming moves them, releases and reversals give them back', () => {
    expect(availableChange({ type: 'ALLOCATION', amount: 18 })).toBe(18);
    expect(availableChange({ type: 'HOLD', amount: 4.5 })).toBe(-4.5);
    expect(availableChange({ type: 'CONSUME', amount: 4.5 })).toBe(0);
    expect(availableChange({ type: 'REVERSAL', amount: 4.5 })).toBe(4.5);
    expect(availableChange({ type: 'RELEASE', amount: 0.5 })).toBe(0.5);
    expect(availableChange({ type: 'EXPIRY', amount: 2 })).toBe(-2);
    expect(availableChange({ type: 'ADJUSTMENT', amount: -1 })).toBe(-1);
  });
});
