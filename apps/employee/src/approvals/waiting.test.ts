import { describe, expect, it } from 'vitest';
import { waitingFor } from './waiting';

const now = new Date('2026-10-22T12:00:00Z');

describe('waitingFor', () => {
  it('uses the largest whole unit', () => {
    expect(waitingFor('2026-10-19T09:00:00Z', now)).toMatch(/^3 days$/);
    expect(waitingFor('2026-10-22T10:30:00Z', now)).toMatch(/^1 hour$/);
    expect(waitingFor('2026-10-22T11:55:00Z', now)).toMatch(/^5 minutes$/);
  });

  it('says under a minute for brand-new tasks and clock skew', () => {
    expect(waitingFor('2026-10-22T11:59:40Z', now)).toBe('under a minute');
    expect(waitingFor('2026-10-22T12:00:05Z', now)).toBe('under a minute');
  });

  it('is empty without a time', () => {
    expect(waitingFor(undefined, now)).toBe('');
  });
});
