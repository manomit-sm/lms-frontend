import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { ActiveBadge, applyFieldErrors, EmptyState, FormError, QueryError, showSuccess } from '@lms/ui';
import {
  Button,
  Card,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBuilding, IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { EmployeeSelect } from '../employees/EmployeeSelect';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Department } from '../types';
import { flattenTree, subtreeIds } from './departmentTree';

interface DepartmentForm {
  code: string;
  name: string;
  parentDepartmentId: string | null;
  headEmployeeId: string | null;
  active: boolean;
}

function DepartmentModal({
  department,
  departments,
  onClose,
}: {
  /** Null to add one. */
  department: Department | null;
  departments: readonly Department[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<DepartmentForm>({
    initialValues: {
      code: department?.code ?? '',
      name: department?.name ?? '',
      parentDepartmentId: department?.parentDepartmentId ?? null,
      headEmployeeId: department?.head?.id ?? null,
      active: department?.active ?? true,
    },
    validate: {
      code: (value) => (value.trim() ? null : 'Enter a code'),
      name: (value) => (value.trim() ? null : 'Enter a name'),
    },
  });
  const create = api.query.useMutation('post', '/api/v1/departments', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/departments/{departmentId}', {
    meta: { handlesError: true },
  });
  // Not under itself or its own sub-departments
  const excluded = department?.id ? subtreeIds(departments, department.id) : new Set<string>();
  const parents = flattenTree(departments)
    .filter(({ department: candidate }) => candidate.id && !excluded.has(candidate.id))
    .map(({ department: candidate, depth }) => ({
      value: candidate.id!,
      label: `${'\u00a0\u00a0\u00a0'.repeat(depth)}${candidate.name}`,
    }));

  function submit(values: DepartmentForm) {
    setFormError(null);
    const body = {
      code: values.code.trim(),
      name: values.name.trim(),
      parentDepartmentId: values.parentDepartmentId ?? undefined,
      headEmployeeId: values.headEmployeeId ?? undefined,
      active: values.active,
    };
    const options = {
      onSuccess: async () => {
        await invalidate(queryClient, '/api/v1/departments');
        showSuccess(department ? 'Department saved.' : 'Department added.');
        onClose();
      },
      onError: (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors)),
    };
    if (department?.id) {
      update.mutate({ params: { path: { departmentId: department.id } }, body }, options);
    } else {
      create.mutate({ body }, options);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={<Text fw={600}>{department ? 'Edit department' : 'Add department'}</Text>}
    >
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <FormError message={formError} />
          <Group grow align="flex-start">
            <TextInput label="Code" required maxLength={40} {...form.getInputProps('code')} data-autofocus />
            <TextInput label="Name" required maxLength={150} {...form.getInputProps('name')} />
          </Group>
          <Select
            label="Part of"
            placeholder="Top level"
            data={parents}
            clearable
            searchable
            {...form.getInputProps('parentDepartmentId')}
          />
          <EmployeeSelect
            label="Head"
            value={form.values.headEmployeeId}
            selected={
              department?.head?.id ? { id: department.head.id, name: department.head.name ?? '' } : null
            }
            onChange={(value) => form.setFieldValue('headEmployeeId', value)}
            error={form.errors.headEmployeeId as string | undefined}
          />
          <Switch
            label="Active"
            description="Inactive departments aren't offered when adding or editing employees."
            {...form.getInputProps('active', { type: 'checkbox' })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {department ? 'Save' : 'Add department'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function DepartmentsTab() {
  const { can } = useCurrentUser();
  const canManage = can(Permission.ORGANIZATION_MANAGE);
  const departments = api.query.useQuery('get', '/api/v1/departments');
  const [editing, setEditing] = useState<Department | null | undefined>(undefined);
  const all = departments.data ?? [];
  const names = new Map(all.map((department) => [department.id, department.name]));

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          The organisation’s structure. Calendars, holidays and policies can apply per department.
        </Text>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Add department
          </Button>
        )}
      </Group>
      {departments.isError && (
        <QueryError error={departments.error} onRetry={() => void departments.refetch()} />
      )}
      {departments.isPending && <Skeleton h={200} />}
      {departments.data && (
        <Card withBorder padding={0}>
          {all.length === 0 ? (
            <EmptyState icon={<IconBuilding size={22} />} title="No departments yet" />
          ) : (
            <Table.ScrollContainer minWidth={600}>
              <Table verticalSpacing="sm" highlightOnHover={canManage}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>Head</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {flattenTree(all).map(({ department, depth }) => (
                    <Table.Tr
                      key={department.id}
                      style={canManage ? { cursor: 'pointer' } : undefined}
                      onClick={canManage ? () => setEditing(department) : undefined}
                    >
                      <Table.Td style={{ paddingLeft: `calc(var(--mantine-spacing-sm) + ${depth * 24}px)` }}>
                        <Text size="sm" fw={depth === 0 ? 500 : 400}>
                          {department.name}
                        </Text>
                        {depth > 0 && (
                          <Text size="xs" c="dimmed">
                            in {names.get(department.parentDepartmentId)}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {department.code}
                        </Text>
                      </Table.Td>
                      <Table.Td>{department.head?.name ?? <Text c="dimmed">—</Text>}</Table.Td>
                      <Table.Td>
                        <ActiveBadge active={department.active} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {editing !== undefined && (
        <DepartmentModal department={editing} departments={all} onClose={() => setEditing(undefined)} />
      )}
    </Stack>
  );
}
