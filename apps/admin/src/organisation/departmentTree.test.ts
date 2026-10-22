import { describe, expect, it } from 'vitest';
import { flattenTree, subtreeIds } from './departmentTree';

const departments = [
  { id: 'eng', name: 'Engineering' },
  { id: 'web', name: 'Web', parentDepartmentId: 'eng' },
  { id: 'api', name: 'API', parentDepartmentId: 'eng' },
  { id: 'edge', name: 'Edge', parentDepartmentId: 'api' },
  { id: 'people', name: 'People' },
  { id: 'orphan', name: 'Orphan', parentDepartmentId: 'gone' },
];

describe('flattenTree', () => {
  it('puts children under their parent, siblings by name', () => {
    expect(flattenTree(departments).map(({ department, depth }) => `${depth}:${department.id}`)).toEqual([
      '0:eng',
      '1:api',
      '2:edge',
      '1:web',
      '0:orphan',
      '0:people',
    ]);
  });
});

describe('subtreeIds', () => {
  it('collects a department and all its descendants', () => {
    expect([...subtreeIds(departments, 'eng')].sort()).toEqual(['api', 'edge', 'eng', 'web']);
    expect([...subtreeIds(departments, 'web')]).toEqual(['web']);
  });
});
