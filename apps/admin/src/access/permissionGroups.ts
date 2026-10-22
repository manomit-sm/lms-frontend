import type { PermissionInfo } from '../types';

export interface PermissionGroup {
  module: string;
  permissions: PermissionInfo[];
}

/** Permissions by module, modules and codes alphabetical, so a picker lists them predictably. */
export function groupPermissions(permissions: readonly PermissionInfo[]): PermissionGroup[] {
  const byModule = new Map<string, PermissionInfo[]>();
  for (const permission of permissions) {
    const module = permission.module ?? 'other';
    byModule.set(module, [...(byModule.get(module) ?? []), permission]);
  }
  return [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, list]) => ({
      module,
      permissions: [...list].sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '')),
    }));
}

const MODULE_LABELS: Record<string, string> = {
  approval: 'Approvals',
  audit: 'Audit',
  balance: 'Balances',
  holiday: 'Holidays',
  identity: 'Users and roles',
  leave: 'Leave',
  leavepolicy: 'Leave policies',
  organization: 'Organisation',
  reporting: 'Reports',
  settings: 'Settings',
};

/** A readable name for a backend module; unknown ones in sentence case ("time_off" → "Time off"). */
export function moduleLabel(module: string): string {
  const known = MODULE_LABELS[module.toLowerCase()];
  if (known) {
    return known;
  }
  const words = module.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
