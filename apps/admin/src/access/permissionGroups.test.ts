import { describe, expect, it } from 'vitest';
import { groupPermissions, moduleLabel } from './permissionGroups';

describe('groupPermissions', () => {
  it('groups by module, both sorted', () => {
    const groups = groupPermissions([
      { code: 'LEAVE_MANAGE', module: 'leave' },
      { code: 'EMPLOYEE_MANAGE', module: 'organization' },
      { code: 'LEAVE_APPLY', module: 'leave' },
    ]);
    expect(
      groups.map((group) => [group.module, group.permissions.map((permission) => permission.code)]),
    ).toEqual([
      ['leave', ['LEAVE_APPLY', 'LEAVE_MANAGE']],
      ['organization', ['EMPLOYEE_MANAGE']],
    ]);
  });
});

describe('moduleLabel', () => {
  it('names the backend modules, and puts unknown ones in sentence case', () => {
    expect(moduleLabel('leavepolicy')).toBe('Leave policies');
    expect(moduleLabel('IDENTITY')).toBe('Users and roles');
    expect(moduleLabel('time_off')).toBe('Time off');
  });
});
