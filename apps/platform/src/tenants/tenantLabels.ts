import type { PlatformSchemas } from '@lms/api';

export type Tenant = PlatformSchemas['schemas']['TenantResponse'];

export const STATUS_COLOR: Record<NonNullable<Tenant['status']>, string> = {
  PROVISIONING: 'blue',
  ACTIVE: 'teal',
  SUSPENDED: 'orange',
  DEACTIVATED: 'gray',
};

export const MIGRATION_COLOR: Record<NonNullable<Tenant['migrationState']>, string> = {
  PENDING: 'blue',
  UP_TO_DATE: 'teal',
  FAILED: 'red',
};

/** "UP_TO_DATE" → "Up to date". */
export function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}

/** A tenant key from its name: "Acme Corp." → "acme-corp". */
export function suggestKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}
