import { describe, expect, it } from 'vitest';
import { returnPath } from './paths';

describe('returnPath', () => {
  it('returns to a page of this portal', () => {
    expect(returnPath('?returnTo=%2Fleave%3Ftab%3Dmine')).toBe('/leave?tab=mine');
  });

  it('never leaves the portal', () => {
    expect(returnPath('?returnTo=https%3A%2F%2Fevil.test')).toBe('/');
    expect(returnPath('?returnTo=%2F%2Fevil.test')).toBe('/');
    expect(returnPath('')).toBe('/');
  });
});
