import type { DaySession } from '@lms/ui';
import dayjs from 'dayjs';
import type { CalendarLeave } from '../leave/types';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** `2026-10` from the URL, or the month of `today` when missing or malformed. */
export function parseMonth(value: string | null, today: string): string {
  return value && MONTH.test(value) ? value : today.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  return dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM');
}

/** Every date of the month, as the API writes dates. */
export function monthDays(month: string): string[] {
  const first = dayjs(`${month}-01`);
  return Array.from({ length: first.daysInMonth() }, (_, index) =>
    first.add(index, 'day').format('YYYY-MM-DD'),
  );
}

/** Which part of `date` a leave covers, or null when the date is outside it. */
export function sessionOn(leave: CalendarLeave, date: string): DaySession | null {
  const { startDate, endDate } = leave;
  if (!startDate || !endDate || date < startDate || date > endDate) {
    return null;
  }
  if (date === startDate) {
    return leave.startSession ?? 'FULL_DAY';
  }
  if (date === endDate) {
    return leave.endSession ?? 'FULL_DAY';
  }
  return 'FULL_DAY';
}

export interface LeaveOnDay {
  leave: CalendarLeave;
  session: DaySession;
}

/** Leave by employee, then by date, for the dates given. A day can hold two half-day entries. */
export function leaveByMemberAndDay(
  leaves: readonly CalendarLeave[],
  days: readonly string[],
): Map<string, Map<string, LeaveOnDay[]>> {
  const byMember = new Map<string, Map<string, LeaveOnDay[]>>();
  for (const leave of leaves) {
    if (!leave.employeeId) {
      continue;
    }
    let byDay = byMember.get(leave.employeeId);
    if (!byDay) {
      byDay = new Map();
      byMember.set(leave.employeeId, byDay);
    }
    for (const day of days) {
      const session = sessionOn(leave, day);
      if (session) {
        const entries = byDay.get(day) ?? [];
        entries.push({ leave, session });
        byDay.set(day, entries);
      }
    }
  }
  return byMember;
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

export type WeekDay = (typeof DAY_NAMES)[number];

/** Whether a date is a working day of the schedule; every day is when the schedule is unknown. */
export function isWorkingDay(date: string, workingDays: readonly WeekDay[] | undefined): boolean {
  return !workingDays?.length || workingDays.includes(DAY_NAMES[dayjs(date).day()]!);
}

/** The API accepts at most 92 days per calendar request; longer ranges are cut at that. */
export function clampRange(from: string, to: string, maxDays = 92): { from: string; to: string } {
  const last = dayjs(from)
    .add(maxDays - 1, 'day')
    .format('YYYY-MM-DD');
  return { from, to: to > last ? last : to };
}
