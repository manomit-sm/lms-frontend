import { useQueries } from '@tanstack/react-query';
import { api } from '../runtime';
import type { Workflow } from '../types';

/** Names for what workflows refer to by id or code: leave types, roles, and named approvers. */
export function useWorkflowNames(workflows: readonly Workflow[]) {
  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types', {
    params: { query: { includeInactive: true } },
  });
  const roles = api.query.useQuery('get', '/api/v1/roles');
  const employeeIds = [
    ...new Set(
      workflows.flatMap((workflow) => (workflow.steps ?? []).map((step) => step.employeeId).filter(Boolean)),
    ),
  ] as string[];
  const employees = useQueries({
    queries: employeeIds.map((employeeId) =>
      api.query.queryOptions('get', '/api/v1/employees/{employeeId}', { params: { path: { employeeId } } }),
    ),
  });
  const employeeNames = new Map(
    employees.map((result, index) => [employeeIds[index], result.data?.fullName]),
  );
  const typeNames = new Map((leaveTypes.data ?? []).map((type) => [type.id, type.name]));
  const roleNames = new Map((roles.data ?? []).map((role) => [role.code, role.name]));
  return {
    leaveType: (id: string) => typeNames.get(id),
    role: (code: string) => roleNames.get(code),
    employee: (id: string) => employeeNames.get(id),
    leaveTypes: leaveTypes.data ?? [],
    roles: roles.data ?? [],
  };
}
