import type { WeekDay } from '../types';

/** The week from Monday, as work schedules list it. */
export const WEEK: { day: WeekDay; short: string }[] = [
  { day: 'MONDAY', short: 'Mon' },
  { day: 'TUESDAY', short: 'Tue' },
  { day: 'WEDNESDAY', short: 'Wed' },
  { day: 'THURSDAY', short: 'Thu' },
  { day: 'FRIDAY', short: 'Fri' },
  { day: 'SATURDAY', short: 'Sat' },
  { day: 'SUNDAY', short: 'Sun' },
];
