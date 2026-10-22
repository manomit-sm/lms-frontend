import type { Department } from '../types';

export interface DepartmentNode {
  department: Department;
  depth: number;
}

const byName = (a: Department, b: Department) => (a.name ?? '').localeCompare(b.name ?? '');

/**
 * Departments in tree order - each parent followed by its sub-departments, siblings by name - with
 * their depth. A department whose parent isn't in the list is shown as a top-level one.
 */
export function flattenTree(departments: readonly Department[]): DepartmentNode[] {
  const ids = new Set(departments.map((department) => department.id));
  const children = new Map<string | undefined, Department[]>();
  for (const department of departments) {
    const parent =
      department.parentDepartmentId && ids.has(department.parentDepartmentId)
        ? department.parentDepartmentId
        : undefined;
    children.set(parent, [...(children.get(parent) ?? []), department]);
  }
  const nodes: DepartmentNode[] = [];
  const visit = (parent: string | undefined, depth: number) => {
    for (const department of [...(children.get(parent) ?? [])].sort(byName)) {
      nodes.push({ department, depth });
      visit(department.id, depth + 1);
    }
  };
  visit(undefined, 0);
  return nodes;
}

/** A department and everything under it: it can't be moved under any of them. */
export function subtreeIds(departments: readonly Department[], id: string): Set<string> {
  const result = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const department of departments) {
      if (
        department.id &&
        department.parentDepartmentId &&
        result.has(department.parentDepartmentId) &&
        !result.has(department.id)
      ) {
        result.add(department.id);
        grew = true;
      }
    }
  }
  return result;
}
