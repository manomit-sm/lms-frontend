import { describe, expect, it } from 'vitest';
import type { CalendarLeave } from '../leave/types';
import {
  clampRange,
  isWorkingDay,
  leaveByMemberAndDay,
  monthDays,
  parseMonth,
  sessionOn,
  shiftMonth,
} from './grid';

const leave = (overrides: Partial<CalendarLeave>): CalendarLeave => ({
  employeeId: 'e1',
  startDate: '2026-11-02',
  endDate: '2026-11-04',
  startSession: 'FULL_DAY',
  endSession: 'FULL_DAY',
  status: 'APPROVED',
  ...overrides,
});

describe('calendar months', () => {
  it('reads the month from the URL or falls back to the current one', () => {
    expect(parseMonth('2026-02', '2026-10-22')).toBe('2026-02');
    expect(parseMonth('2026-13', '2026-10-22')).toBe('2026-10');
    expect(parseMonth(null, '2026-10-22')).toBe('2026-10');
  });

  it('moves across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('lists every day, leap years included', () => {
    const february = monthDays('2028-02');
    expect(february).toHaveLength(29);
    expect(february[0]).toBe('2028-02-01');
    expect(february.at(-1)).toBe('2028-02-29');
  });
});

describe('sessionOn', () => {
  it('uses the start and end sessions on the first and last day', () => {
    const halves = leave({ startSession: 'SECOND_HALF', endSession: 'FIRST_HALF' });
    expect(sessionOn(halves, '2026-11-02')).toBe('SECOND_HALF');
    expect(sessionOn(halves, '2026-11-03')).toBe('FULL_DAY');
    expect(sessionOn(halves, '2026-11-04')).toBe('FIRST_HALF');
    expect(sessionOn(halves, '2026-11-05')).toBeNull();
  });

  it('uses the one session of a single day', () => {
    const single = leave({ endDate: '2026-11-02', startSession: 'FIRST_HALF', endSession: 'FIRST_HALF' });
    expect(sessionOn(single, '2026-11-02')).toBe('FIRST_HALF');
  });
});

describe('leaveByMemberAndDay', () => {
  it('groups leave by employee and day, keeping two halves of one day', () => {
    const morning = leave({ endDate: '2026-11-02', startSession: 'FIRST_HALF', endSession: 'FIRST_HALF' });
    const afternoon = leave({
      endDate: '2026-11-02',
      startSession: 'SECOND_HALF',
      endSession: 'SECOND_HALF',
    });
    const other = leave({ employeeId: 'e2', startDate: '2026-10-30', endDate: '2026-11-01' });

    const grid = leaveByMemberAndDay([morning, afternoon, other], ['2026-11-01', '2026-11-02']);

    expect(
      grid
        .get('e1')
        ?.get('2026-11-02')
        ?.map((entry) => entry.session),
    ).toEqual(['FIRST_HALF', 'SECOND_HALF']);
    expect(grid.get('e1')?.has('2026-11-01')).toBe(false);
    expect(grid.get('e2')?.get('2026-11-01')?.[0]?.session).toBe('FULL_DAY');
  });
});

describe('isWorkingDay', () => {
  it('follows the schedule, and treats every day as working without one', () => {
    const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
    expect(isWorkingDay('2026-10-24', weekdays)).toBe(false); // Saturday
    expect(isWorkingDay('2026-10-23', weekdays)).toBe(true);
    expect(isWorkingDay('2026-10-24', undefined)).toBe(true);
  });
});

describe('clampRange', () => {
  it('cuts ranges longer than the API allows', () => {
    expect(clampRange('2026-01-01', '2026-12-31')).toEqual({ from: '2026-01-01', to: '2026-04-02' });
    expect(clampRange('2026-01-01', '2026-01-10')).toEqual({ from: '2026-01-01', to: '2026-01-10' });
  });
});
