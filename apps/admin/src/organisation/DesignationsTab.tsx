import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { ActiveBadge, applyFieldErrors, EmptyState, FormError, QueryError, showSuccess } from '@lms/ui';
import {
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBriefcase, IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Designation } from '../types';

interface DesignationForm {
  name: string;
  level: number | string;
  active: boolean;
}

function DesignationModal({
  designation,
  onClose,
}: {
  designation: Designation | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<DesignationForm>({
    initialValues: {
      name: designation?.name ?? '',
      level: designation?.level ?? '',
      active: designation?.active ?? true,
    },
    validate: { name: (value) => (value.trim() ? null : 'Enter a name') },
  });
  const create = api.query.useMutation('post', '/api/v1/designations', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/designations/{designationId}', {
    meta: { handlesError: true },
  });

  function submit(values: DesignationForm) {
    setFormError(null);
    const body = {
      name: values.name.trim(),
      level: typeof values.level === 'number' ? values.level : undefined,
      active: values.active,
    };
    const options = {
      onSuccess: async () => {
        await invalidate(queryClient, '/api/v1/designations');
        showSuccess(designation ? 'Designation saved.' : 'Designation added.');
        onClose();
      },
      onError: (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors)),
    };
    if (designation?.id) {
      update.mutate({ params: { path: { designationId: designation.id } }, body }, options);
    } else {
      create.mutate({ body }, options);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={<Text fw={600}>{designation ? 'Edit designation' : 'Add designation'}</Text>}
    >
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <FormError message={formError} />
          <TextInput label="Name" required maxLength={150} {...form.getInputProps('name')} data-autofocus />
          <NumberInput
            label="Level"
            description="Optional seniority, for sorting (e.g. 1 for junior)."
            min={0}
            allowDecimal={false}
            {...form.getInputProps('level')}
          />
          <Switch label="Active" {...form.getInputProps('active', { type: 'checkbox' })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {designation ? 'Save' : 'Add designation'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function DesignationsTab() {
  const { can } = useCurrentUser();
  const canManage = can(Permission.ORGANIZATION_MANAGE);
  const designations = api.query.useQuery('get', '/api/v1/designations');
  const [editing, setEditing] = useState<Designation | null | undefined>(undefined);
  const rows = [...(designations.data ?? [])].sort(
    (a, b) => (a.level ?? Infinity) - (b.level ?? Infinity) || (a.name ?? '').localeCompare(b.name ?? ''),
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Job titles employees hold.
        </Text>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Add designation
          </Button>
        )}
      </Group>
      {designations.isError && (
        <QueryError error={designations.error} onRetry={() => void designations.refetch()} />
      )}
      {designations.isPending && <Skeleton h={200} />}
      {designations.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconBriefcase size={22} />} title="No designations yet" />
          ) : (
            <Table verticalSpacing="sm" highlightOnHover={canManage}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Level</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((designation) => (
                  <Table.Tr
                    key={designation.id}
                    style={canManage ? { cursor: 'pointer' } : undefined}
                    onClick={canManage ? () => setEditing(designation) : undefined}
                  >
                    <Table.Td>{designation.name}</Table.Td>
                    <Table.Td>{designation.level ?? <Text c="dimmed">—</Text>}</Table.Td>
                    <Table.Td>
                      <ActiveBadge active={designation.active} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      )}
      {editing !== undefined && (
        <DesignationModal designation={editing} onClose={() => setEditing(undefined)} />
      )}
    </Stack>
  );
}
