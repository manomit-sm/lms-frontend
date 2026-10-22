import { formatDay, LEAVE_STATUS, SESSION_LABEL } from '@lms/ui';
import { Text, Tooltip } from '@mantine/core';
import dayjs from 'dayjs';
import { Fragment, useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import type { CalendarHoliday, CalendarLeave, CalendarMember } from '../leave/types';
import { isWorkingDay, leaveByMemberAndDay, type LeaveOnDay, type WeekDay } from './grid';
import classes from './LeaveGrid.module.css';

/** Leave shown without its type (a colleague outside the viewer's reporting line) uses this colour. */
export const UNDISCLOSED_COLOR = 'var(--mantine-color-gray-5)';

export interface LeaveGridProps {
  members: readonly CalendarMember[];
  leaves: readonly CalendarLeave[];
  holidays: readonly CalendarHoliday[];
  days: readonly string[];
  today: string;
  /** The viewer's working days; other days are shaded. */
  workingDays: readonly WeekDay[] | undefined;
  onDayClick?: (date: string) => void;
}

function describe(name: string | undefined, entry: LeaveOnDay): string {
  const { leave, session } = entry;
  return [
    name,
    leave.leaveType?.name ?? 'On leave',
    session !== 'FULL_DAY' ? SESSION_LABEL[session] : null,
    leave.status === 'PENDING' ? LEAVE_STATUS.PENDING.label : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function LeaveBar({
  entry,
  memberName,
  linkable,
}: {
  entry: LeaveOnDay;
  memberName?: string;
  linkable: boolean;
}) {
  const label = describe(memberName, entry);
  const props = {
    className: classes.bar,
    style: { backgroundColor: entry.leave.leaveType?.color ?? UNDISCLOSED_COLOR } satisfies CSSProperties,
    'data-session': entry.session,
    'data-pending': entry.leave.status === 'PENDING' || undefined,
    'aria-label': label,
  };
  return (
    <Tooltip label={label} withinPortal openDelay={150}>
      {linkable && entry.leave.id ? (
        <Link to={`/leave/${entry.leave.id}`} {...props} />
      ) : (
        <span role="img" {...props} />
      )}
    </Tooltip>
  );
}

/**
 * Members down the side, the month's days across: who is away when. Half days fill half a cell;
 * pending leave is striped; non-working days and holidays are shaded, and leave never covers them.
 */
export function LeaveGrid({
  members,
  leaves,
  holidays,
  days,
  today,
  workingDays,
  onDayClick,
}: LeaveGridProps) {
  const byMember = leaveByMemberAndDay(leaves, days);
  const holidayOn = new Map<string, string[]>();
  for (const holiday of holidays) {
    if (holiday.date) {
      holidayOn.set(holiday.date, [...(holidayOn.get(holiday.date) ?? []), holiday.name ?? 'Holiday']);
    }
  }
  const scroller = useRef<HTMLDivElement>(null);
  const showsToday = days.includes(today);

  // On narrow screens the month scrolls sideways: start with today in view, a few days after the names
  useEffect(() => {
    const element = scroller.current;
    const todayHeader = element?.querySelector<HTMLElement>('[data-today]');
    const names = element?.querySelector<HTMLElement>(`.${classes.corner}`);
    if (element && todayHeader && names && element.scrollWidth > element.clientWidth) {
      element.scrollLeft = todayHeader.offsetLeft - names.offsetWidth - 2 * todayHeader.offsetWidth;
    }
  }, [showsToday]);

  const dayFlags = days.map((day) => ({
    day,
    off: !isWorkingDay(day, workingDays),
    holiday: holidayOn.get(day)?.join(', '),
  }));

  return (
    <div className={classes.scroller} ref={scroller}>
      <div className={classes.grid} style={{ '--days': days.length } as CSSProperties}>
        <div className={classes.corner} aria-hidden>
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </div>
        {dayFlags.map(({ day, off, holiday }) => {
          const date = dayjs(day);
          const header = (
            <button
              key={day}
              type="button"
              className={classes.day}
              data-today={day === today || undefined}
              data-off={off || undefined}
              data-holiday={holiday ? true : undefined}
              aria-label={`Who is available on ${formatDay(day)}${holiday ? ` (${holiday})` : ''}`}
              onClick={() => onDayClick?.(day)}
            >
              <span>{date.format('dd').charAt(0)}</span>
              <span className={classes.dayNumber}>{date.date()}</span>
            </button>
          );
          return holiday ? (
            <Tooltip key={day} label={holiday} withinPortal>
              {header}
            </Tooltip>
          ) : (
            header
          );
        })}

        {members.map((member) => {
          const memberLeave = byMember.get(member.id ?? '');
          return (
            <Fragment key={member.id}>
              <div className={classes.name}>
                <Text size="sm" truncate>
                  {member.name}
                </Text>
              </div>
              {dayFlags.map(({ day, off, holiday }) => (
                <div
                  key={day}
                  className={classes.cell}
                  data-off={off || undefined}
                  data-holiday={holiday ? true : undefined}
                >
                  {!off &&
                    !holiday &&
                    memberLeave
                      ?.get(day)
                      ?.map((entry, index) => (
                        <LeaveBar
                          key={`${entry.leave.id ?? index}-${entry.session}`}
                          entry={entry}
                          memberName={member.name}
                          linkable={Boolean(member.detailed)}
                        />
                      ))}
                </div>
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
