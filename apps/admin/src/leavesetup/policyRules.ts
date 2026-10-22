import { EMPLOYMENT_TYPE, formatDate, formatDateRange } from '@lms/ui';
import type { PolicyRule } from '../types';

export const GENDER_LABEL: Record<NonNullable<PolicyRule['gender']>, string> = {
  FEMALE: 'Women',
  MALE: 'Men',
  OTHER: 'Other gender',
  UNDISCLOSED: 'Gender not given',
};

/** Names of the organisation's departments, designations and locations, by id. */
export interface OrgNames {
  departments: ReadonlyMap<string | undefined, string | undefined>;
  designations: ReadonlyMap<string | undefined, string | undefined>;
  locations: ReadonlyMap<string | undefined, string | undefined>;
}

/** "Engineering · Full time · Women": every criterion must match; none means everyone. */
export function describeRule(rule: PolicyRule, names: OrgNames): string {
  const parts = [
    rule.departmentId && (names.departments.get(rule.departmentId) ?? 'Unknown department'),
    rule.designationId && (names.designations.get(rule.designationId) ?? 'Unknown designation'),
    rule.locationId && (names.locations.get(rule.locationId) ?? 'Unknown location'),
    rule.employmentType && EMPLOYMENT_TYPE[rule.employmentType],
    rule.gender && GENDER_LABEL[rule.gender],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Everyone';
}

/** A policy applies to anyone matching any of its rules; with no rules, to everyone. */
export function describeAppliesTo(rules: readonly PolicyRule[] | undefined, names: OrgNames): string {
  return rules?.length ? rules.map((rule) => describeRule(rule, names)).join('; or ') : 'Everyone';
}

/** Rules with no criteria at all would match everyone, so they are dropped before saving. */
export function meaningfulRules(rules: readonly PolicyRule[]): PolicyRule[] {
  return rules
    .map((rule) => Object.fromEntries(Object.entries(rule).filter(([, value]) => value)) as PolicyRule)
    .filter((rule) => Object.keys(rule).length > 0);
}

export const ACCRUAL_LABEL = { UPFRONT: 'At the start', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly' } as const;

/** When a policy is in force: "Always", "From 1 Jan 2026", "Until 31 Mar 2026" or a range. */
export function describeEffective(from: string | undefined, to: string | undefined): string {
  if (from && to) {
    return formatDateRange(from, to);
  }
  if (from) {
    return `From ${formatDate(from)}`;
  }
  return to ? `Until ${formatDate(to)}` : 'Always';
}
