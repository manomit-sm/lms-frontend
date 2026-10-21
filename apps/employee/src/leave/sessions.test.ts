import { describe, expect, it } from 'vitest';
import { describeSessions, FULL_DAYS, toSessions } from './sessions';

describe('toSessions', () => {
  it('gives a single day one session', () => {
    expect(toSessions('2026-10-23', '2026-10-23', { ...FULL_DAYS, singleDay: 'SECOND_HALF' })).toEqual({
      startSession: 'SECOND_HALF',
      endSession: 'SECOND_HALF',
    });
  });

  it('lets a longer request start at the second half and end at the first half', () => {
    expect(
      toSessions('2026-11-02', '2026-11-06', {
        singleDay: 'FIRST_HALF',
        startsAtSecondHalf: true,
        endsAtFirstHalf: true,
      }),
    ).toEqual({ startSession: 'SECOND_HALF', endSession: 'FIRST_HALF' });
  });

  it('ignores the single-day choice for longer requests', () => {
    expect(toSessions('2026-11-02', '2026-11-06', { ...FULL_DAYS, singleDay: 'FIRST_HALF' })).toEqual({
      startSession: 'FULL_DAY',
      endSession: 'FULL_DAY',
    });
  });
});

describe('describeSessions', () => {
  it('says nothing for full days', () => {
    expect(describeSessions('2026-11-02', '2026-11-06', 'FULL_DAY', 'FULL_DAY')).toBeNull();
    expect(describeSessions('2026-10-23', '2026-10-23', 'FULL_DAY', 'FULL_DAY')).toBeNull();
  });

  it('describes half days', () => {
    expect(describeSessions('2026-10-23', '2026-10-23', 'SECOND_HALF', 'SECOND_HALF')).toBe('Second half');
    expect(describeSessions('2026-11-02', '2026-11-06', 'SECOND_HALF', 'FIRST_HALF')).toBe(
      'Starts at the second half, ends at the first half',
    );
    expect(describeSessions('2026-11-02', '2026-11-06', 'FULL_DAY', 'FIRST_HALF')).toBe(
      'Ends at the first half',
    );
  });
});
