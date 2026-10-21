import { describe, expect, it } from 'vitest';
import { activeNavItem } from './activeNavItem';

const items = ['/', '/leave/apply', '/leave', '/balances'].map((to) => ({ label: to, to, icon: null }));

describe('activeNavItem', () => {
  it('lights up the most specific item the page is in', () => {
    expect(activeNavItem(items, '/')).toBe('/');
    expect(activeNavItem(items, '/leave/apply')).toBe('/leave/apply');
    expect(activeNavItem(items, '/leave')).toBe('/leave');
    expect(activeNavItem(items, '/leave/6afbb058')).toBe('/leave');
  });

  it('does not match on a shared prefix alone', () => {
    expect(activeNavItem(items, '/leaves')).toBeUndefined();
    expect(activeNavItem(items, '/profile')).toBeUndefined();
  });
});
