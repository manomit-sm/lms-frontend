/**
 * Display formatting in the browser's locale. Dates from the API are ISO calendar dates (`2026-10-21`)
 * in the tenant's timezone: they are formatted as calendar dates, never shifted through UTC.
 */

function calendarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

export function formatDate(isoDate: string | null | undefined, style: 'medium' | 'long' = 'medium'): string {
  return isoDate ? calendarDate(isoDate).toLocaleDateString(undefined, { dateStyle: style }) : '';
}

/** "21 Oct 2026, Wed": a single leave day. */
export function formatDay(isoDate: string): string {
  return calendarDate(isoDate).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "21 – 23 Oct 2026", "30 Oct – 2 Nov 2026", or one date when both are the same. */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) {
    return formatDate(start ?? end);
  }
  if (start === end) {
    return formatDate(start);
  }
  const format = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return format.formatRange(calendarDate(start), calendarDate(end));
}

export function formatDateTime(isoDateTime: string | null | undefined): string {
  return isoDateTime
    ? new Date(isoDateTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
}

/** "1 day", "0.5 days", "2.5 days" - leave amounts are whole or half days. */
export function formatDays(days: number | null | undefined): string {
  const value = days ?? 0;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text} ${value === 1 ? 'day' : 'days'}`;
}

/** A balance figure without the unit, e.g. "12", "7.5". */
export function formatAmount(days: number | null | undefined): string {
  const value = days ?? 0;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** The local calendar date of an instant (e.g. when a request was made). */
export function formatInstantDate(isoDateTime: string | null | undefined): string {
  return isoDateTime ? new Date(isoDateTime).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
}
