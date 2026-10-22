import { describe, expect, it } from 'vitest';
import { formatAmount, formatDate, formatDateRange, formatDays, formatRelativeTime, isoDate } from './format';

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

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-22T12:00:00Z');

  it('says how long ago, in the largest unit', () => {
    expect(formatRelativeTime('2026-10-22T11:55:00Z', now)).toMatch(/5 minutes ago/);
    expect(formatRelativeTime('2026-10-22T09:00:00Z', now)).toMatch(/3 hours ago/);
    expect(formatRelativeTime('2026-10-21T12:00:00Z', now)).toMatch(/yesterday/);
  });

  it('says just now under a minute, and nothing without a time', () => {
    expect(formatRelativeTime('2026-10-22T11:59:30Z', now)).toBe('just now');
    expect(formatRelativeTime(undefined, now)).toBe('');
  });
});

describe('isoDate', () => {
  it('writes the local calendar date with padding', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
