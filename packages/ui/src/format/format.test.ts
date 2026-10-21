import { describe, expect, it } from 'vitest';
import { formatAmount, formatDate, formatDateRange, formatDays } from './format';

describe('formatDays', () => {
  it('writes whole and half days', () => {
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(0.5)).toBe('0.5 days');
    expect(formatDays(4.5)).toBe('4.5 days');
    expect(formatDays(undefined)).toBe('0 days');
    expect(formatAmount(18)).toBe('18');
    expect(formatAmount(7.5)).toBe('7.5');
  });
});

describe('formatDate', () => {
  it('formats calendar dates without shifting them through UTC', () => {
    // midnight UTC would be the previous day west of Greenwich
    const expected = new Date(2026, 0, 1).toLocaleDateString(undefined, { dateStyle: 'medium' });
    expect(formatDate('2026-01-01')).toBe(expected);
    expect(formatDate(undefined)).toBe('');
  });

  it('collapses a one-day range to one date', () => {
    expect(formatDateRange('2026-10-23', '2026-10-23')).toBe(formatDate('2026-10-23'));
    expect(formatDateRange('2026-11-02', '2026-11-06')).not.toBe(formatDate('2026-11-02'));
  });
});
