import type { Permission, TenantSchemas } from '@lms/api';
import { createContext, useContext } from 'react';

export type Me = TenantSchemas['schemas']['MeResponse'];

export interface CurrentUser {
  me: Me;
  /** Display name: the employee's name, or the email for users not linked to an employee. */
  name: string;
  can: (permission: Permission) => boolean;
  canAny: (permissions: readonly Permission[]) => boolean;
}

export const CurrentUserContext = createContext<CurrentUser | null>(null);

export function toCurrentUser(me: Me): CurrentUser {
  const permissions = new Set(me.permissions ?? []);
  const employeeName = [me.employee?.firstName, me.employee?.lastName].filter(Boolean).join(' ');
  return {
    me,
    name: employeeName || me.email || 'Signed in',
    can: (permission) => permissions.has(permission),
    canAny: (wanted) => wanted.some((permission) => permissions.has(permission)),
  };
}

export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext);
  if (!user) {
    throw new Error('useCurrentUser must be used inside <CurrentUserProvider>');
  }
  return user;
}
