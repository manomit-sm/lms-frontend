import { describe, expect, it } from 'vitest';
import { toCurrentUser } from './currentUser';

describe('toCurrentUser', () => {
  it('is named after the employee and answers permission checks', () => {
    const user = toCurrentUser({
      email: 'asha@acme.test',
      permissions: ['LEAVE_APPLY', 'LEAVE_APPROVE'],
      employee: { firstName: 'Asha', lastName: 'Rao' },
    });

    expect(user.name).toBe('Asha Rao');
    expect(user.can('LEAVE_APPROVE')).toBe(true);
    expect(user.can('USER_MANAGE')).toBe(false);
    expect(user.canAny(['USER_MANAGE', 'LEAVE_APPLY'])).toBe(true);
    expect(user.canAny([])).toBe(false);
  });

  it('falls back to the email for users without an employee', () => {
    expect(toCurrentUser({ email: 'admin@acme.test', permissions: [] }).name).toBe('admin@acme.test');
  });
});
