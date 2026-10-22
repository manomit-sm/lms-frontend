import { describe, expect, it } from 'vitest';
import {
  describeAppliesTo,
  describeEffective,
  describeRule,
  meaningfulRules,
  type OrgNames,
} from './policyRules';

const names: OrgNames = {
  departments: new Map([['eng', 'Engineering']]),
  designations: new Map(),
  locations: new Map([['blr', 'Bengaluru']]),
};

describe('policy rules', () => {
  it('describes each criterion of a rule', () => {
    expect(describeRule({ departmentId: 'eng', employmentType: 'FULL_TIME', gender: 'FEMALE' }, names)).toBe(
      'Engineering · Full time · Women',
    );
    expect(describeRule({}, names)).toBe('Everyone');
  });

  it('joins rules with "or", and says everyone without rules', () => {
    expect(describeAppliesTo([{ departmentId: 'eng' }, { locationId: 'blr' }], names)).toBe(
      'Engineering; or Bengaluru',
    );
    expect(describeAppliesTo([], names)).toBe('Everyone');
  });

  it('drops empty criteria and empty rules before saving', () => {
    expect(meaningfulRules([{ departmentId: 'eng', locationId: undefined }, {}])).toEqual([
      { departmentId: 'eng' },
    ]);
  });
});

describe('describeEffective', () => {
  it('says always, from, until or the range', () => {
    expect(describeEffective(undefined, undefined)).toBe('Always');
    expect(describeEffective('2026-01-01', undefined)).toMatch(/^From /);
    expect(describeEffective(undefined, '2026-03-31')).toMatch(/^Until /);
    expect(describeEffective('2026-01-01', '2026-03-31')).toMatch(/2026/);
  });
});
