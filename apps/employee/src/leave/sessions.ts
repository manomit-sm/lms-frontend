import type { DaySession } from '@lms/ui';

/** How the form describes half days; the API takes a start and an end session. */
export interface SessionChoice {
  /** One-day requests: the whole day or one half. */
  singleDay: DaySession;
  /** Longer requests: the first day starts after the morning. */
  startsAtSecondHalf: boolean;
  /** Longer requests: the last day ends at midday. */
  endsAtFirstHalf: boolean;
}

export const FULL_DAYS: SessionChoice = {
  singleDay: 'FULL_DAY',
  startsAtSecondHalf: false,
  endsAtFirstHalf: false,
};

/**
 * The sessions the backend accepts: a single-day request has one session (full, first or second half),
 * a longer one may start with the second half and end with the first half.
 */
export function toSessions(
  startDate: string,
  endDate: string,
  choice: SessionChoice,
): { startSession: DaySession; endSession: DaySession } {
  if (startDate === endDate) {
    return { startSession: choice.singleDay, endSession: choice.singleDay };
  }
  return {
    startSession: choice.startsAtSecondHalf ? 'SECOND_HALF' : 'FULL_DAY',
    endSession: choice.endsAtFirstHalf ? 'FIRST_HALF' : 'FULL_DAY',
  };
}

/** "Full day", "First half", or for longer requests "From the second half · to the first half". */
export function describeSessions(
  startDate: string | undefined,
  endDate: string | undefined,
  startSession: DaySession | undefined,
  endSession: DaySession | undefined,
): string | null {
  if (!startDate || !endDate) {
    return null;
  }
  if (startDate === endDate) {
    return startSession === 'FIRST_HALF'
      ? 'First half'
      : startSession === 'SECOND_HALF'
        ? 'Second half'
        : null;
  }
  const parts = [
    startSession === 'SECOND_HALF' ? 'starts at the second half' : null,
    endSession === 'FIRST_HALF' ? 'ends at the first half' : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ').replace(/^./, (first) => first.toUpperCase()) : null;
}
