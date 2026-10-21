import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from './SessionStore';

const inMinutes = (minutes: number) => Date.now() + minutes * 60_000;

describe('SessionStore', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps the session across a reload of the same portal only', () => {
    new SessionStore('employee').set({ accessToken: 'a', expiresAt: inMinutes(60), label: 'asha' });

    expect(new SessionStore('employee').get()?.accessToken).toBe('a');
    expect(new SessionStore('admin').get()).toBeNull();
  });

  it('tells listeners about sign-in and sign-out', () => {
    const store = new SessionStore('employee');
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ accessToken: 'a', expiresAt: inMinutes(60), label: 'asha' });
    store.clear();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('ends the session shortly before the token expires', () => {
    vi.useFakeTimers();
    const store = new SessionStore('employee');
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ accessToken: 'a', expiresAt: inMinutes(10), label: 'asha' });

    vi.advanceTimersByTime(9 * 60_000);
    expect(store.get()).not.toBeNull();

    vi.advanceTimersByTime(40_000);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()).toBeNull();
  });

  it('ignores an unreadable stored session', () => {
    window.sessionStorage.setItem('lms.employee.session', '{not json');

    expect(new SessionStore('employee').get()).toBeNull();
  });
});
