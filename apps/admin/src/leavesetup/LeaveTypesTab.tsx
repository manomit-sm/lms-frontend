import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  ActiveBadge,
  applyFieldErrors,
  EmptyState,
  FormError,
  LeaveTypeLabel,
  QueryError,
  showSuccess,
} from '@lms/ui';
import {
  Badge,
  Button,
  Card,
  ColorInput,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCategory, IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { LeaveType } from '../types';

const SWATCHES = ['#2f9e44', '#1971c2', '#e03131', '#f08c00', '#9c36b5', '#0c8599', '#5c7cfa', '#868e96'];

interface LeaveTypeForm {
  code: string;
  name: string;
  description: string;
  color: string;
  paid: boolean;
  balanceTracked: boolean;
  timeOff: boolean;
  halfDayAllowed: boolean;
  active: boolean;
  sortOrder: number | string;
}

function LeaveTypeModal({ leaveType, onClose }: { leaveType: LeaveType | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LeaveTypeForm>({
    initialValues: {
      code: leaveType?.code ?? '',
      name: leaveType?.name ?? '',
      description: leaveType?.description ?? '',
      color: leaveType?.color ?? SWATCHES[0]!,
      paid: leaveType?.paid ?? true,
      balanceTracked: leaveType?.balanceTracked ?? true,
      timeOff: leaveType?.timeOff ?? true,
      halfDayAllowed: leaveType?.halfDayAllowed ?? true,
      active: leaveType?.active ?? true,
      sortOrder: leaveType?.sortOrder ?? '',
    },
    validate: {
      code: (value) =>
        /^[A-Za-z][A-Za-z0-9_]{1,39}$/.test(value) ? null : 'Letters, digits and _, starting with a letter',
      name: (value) => (value.trim() ? null : 'Enter a name'),
      color: (value) => (/^#[0-9A-Fa-f]{6}$/.test(value) ? null : 'Pick a colour'),
    },
  });
  const create = api.query.useMutation('post', '/api/v1/leave-types', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/leave-types/{leaveTypeId}', {
    meta: { handlesError: true },
  });

  function submit(values: LeaveTypeForm) {
    setFormError(null);
    const body = {
      ...values,
      code: values.code.toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      sortOrder: typeof values.sortOrder === 'number' ? values.sortOrder : undefined,
    };
    const options = {
      onSuccess: async () => {
        await invalidate(queryClient, '/api/v1/leave-types', '/api/v1/leave-policies');
        showSuccess(leaveType ? 'Leave type saved.' : 'Leave type added.');
        onClose();
      },
      onError: (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors)),
    };
    if (leaveType?.id) {
      update.mutate({ params: { path: { leaveTypeId: leaveType.id } }, body }, options);
    } else {
      create.mutate({ body }, options);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      size="lg"
      title={<Text fw={600}>{leaveType ? 'Edit leave type' : 'Add leave type'}</Text>}
    >
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <FormError message={formError} />
          <Group grow align="flex-start">
            <TextInput
              label="Code"
              required
              maxLength={40}
              {...form.getInputProps('code')}
              onChange={(event) => form.setFieldValue('code', event.currentTarget.value.toUpperCase())}
              data-autofocus
            />
            <TextInput label="Name" required maxLength={100} {...form.getInputProps('name')} />
          </Group>
          <Textarea
            label="Description"
            autosize
            minRows={2}
            maxLength={500}
            {...form.getInputProps('description')}
          />
          <Group grow align="flex-start">
            <ColorInput
              label="Colour"
              description="In calendars and lists"
              required
              format="hex"
              swatches={SWATCHES}
              {...form.getInputProps('color')}
            />
            <NumberInput
              label="Order"
              description="Lower comes first"
              allowDecimal={false}
              {...form.getInputProps('sortOrder')}
            />
          </Group>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Switch label="Paid" {...form.getInputProps('paid', { type: 'checkbox' })} />
            <Switch
              label="Tracked against a balance"
              description="Off for e.g. unpaid leave: no allocation, no limit."
              {...form.getInputProps('balanceTracked', { type: 'checkbox' })}
            />
            <Switch
              label="Time off"
              description="Off for e.g. working from home: the person is still working."
              {...form.getInputProps('timeOff', { type: 'checkbox' })}
            />
            <Switch
              label="Half days allowed"
              {...form.getInputProps('halfDayAllowed', { type: 'checkbox' })}
            />
            <Switch
              label="Active"
              description="Inactive types can't be applied for. Types are never deleted."
              {...form.getInputProps('active', { type: 'checkbox' })}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {leaveType ? 'Save' : 'Add leave type'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function Flags({ leaveType }: { leaveType: LeaveType }) {
  const flags = [
    leaveType.paid ? 'Paid' : 'Unpaid',
    leaveType.balanceTracked ? 'Balance' : null,
    leaveType.timeOff === false ? 'Still working' : null,
    leaveType.halfDayAllowed ? 'Half days' : null,
  ].filter(Boolean);
  return (
    <Group gap={4}>
      {flags.map((flag) => (
        <Badge key={flag} size="sm" variant="outline" color="gray">
          {flag}
        </Badge>
      ))}
    </Group>
  );
}

export function LeaveTypesTab() {
  const { can } = useCurrentUser();
  const canManage = can(Permission.LEAVE_POLICY_MANAGE);
  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types', {
    params: { query: { includeInactive: true } },
  });
  const [editing, setEditing] = useState<LeaveType | null | undefined>(undefined);
  const rows = [...(leaveTypes.data ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.name ?? '').localeCompare(b.name ?? ''),
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          The kinds of leave people can take. Policies say who gets how much of each.
        </Text>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Add leave type
          </Button>
        )}
      </Group>
      {leaveTypes.isError && (
        <QueryError error={leaveTypes.error} onRetry={() => void leaveTypes.refetch()} />
      )}
      {leaveTypes.isPending && <Skeleton h={240} />}
      {leaveTypes.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconCategory size={22} />} title="No leave types yet" />
          ) : (
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing="sm" highlightOnHover={canManage}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Leave type</Table.Th>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>Kind</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((leaveType) => (
                    <Table.Tr
                      key={leaveType.id}
                      style={canManage ? { cursor: 'pointer' } : undefined}
                      onClick={canManage ? () => setEditing(leaveType) : undefined}
                    >
                      <Table.Td>
                        <LeaveTypeLabel name={leaveType.name} color={leaveType.color} />
                        {leaveType.description && (
                          <Text size="xs" c="dimmed" lineClamp={1} pl={18}>
                            {leaveType.description}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {leaveType.code}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Flags leaveType={leaveType} />
                      </Table.Td>
                      <Table.Td>
                        <ActiveBadge active={leaveType.active} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {editing !== undefined && <LeaveTypeModal leaveType={editing} onClose={() => setEditing(undefined)} />}
    </Stack>
  );
}
