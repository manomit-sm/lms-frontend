import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  applyFieldErrors,
  EmptyState,
  formatDate,
  FormError,
  QueryError,
  showSuccess,
  todayIso,
} from '@lms/ui';
import { Badge, Button, Card, Group, Modal, Skeleton, Stack, Table, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconCalendarStats, IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { LeavePeriod } from '../types';

interface PeriodForm {
  name: string;
  startDate: string | null;
  endDate: string | null;
}

/** The next period starts the day after the latest one ends and lasts a year, as most do. */
function suggestion(periods: readonly LeavePeriod[]): PeriodForm {
  const last = [...periods].sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))[0];
  if (!last?.endDate) {
    return { name: '', startDate: null, endDate: null };
  }
  const start = dayjs(last.endDate).add(1, 'day');
  const end = start.add(1, 'year').subtract(1, 'day');
  return {
    name: start.year() === end.year() ? String(start.year()) : `${start.year()}–${end.format('YY')}`,
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
  };
}

function PeriodModal({ periods, onClose }: { periods: readonly LeavePeriod[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PeriodForm>({
    initialValues: suggestion(periods),
    validate: {
      name: (value) => (value.trim() ? null : 'Enter a name'),
      startDate: (value) => (value ? null : 'Pick the first day'),
      endDate: (value, values) =>
        !value
          ? 'Pick the last day'
          : values.startDate && value < values.startDate
            ? 'Must be after the start'
            : null,
    },
  });
  const create = api.query.useMutation('post', '/api/v1/leave-periods', { meta: { handlesError: true } });

  return (
    <Modal opened onClose={onClose} title={<Text fw={600}>Add leave period</Text>}>
      <form
        onSubmit={form.onSubmit((values) => {
          setFormError(null);
          create.mutate(
            { body: { name: values.name.trim(), startDate: values.startDate!, endDate: values.endDate! } },
            {
              onSuccess: async () => {
                await invalidate(queryClient, '/api/v1/leave-periods', '/api/v1/leave-periods/current');
                showSuccess('Leave period added. Allocate its balances from Balances.');
                onClose();
              },
              onError: (error) => setFormError(applyFieldErrors(error, form.setErrors)),
            },
          );
        })}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Balances are allocated, used and carried forward per leave period. Periods can’t overlap.
          </Text>
          <FormError message={formError} />
          <TextInput label="Name" required maxLength={100} {...form.getInputProps('name')} data-autofocus />
          <Group grow align="flex-start">
            <DatePickerInput
              label="First day"
              required
              valueFormat="D MMM YYYY"
              {...form.getInputProps('startDate')}
            />
            <DatePickerInput
              label="Last day"
              required
              valueFormat="D MMM YYYY"
              minDate={form.values.startDate ?? undefined}
              {...form.getInputProps('endDate')}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add leave period
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function PeriodsTab() {
  const { can } = useCurrentUser();
  const periods = api.query.useQuery('get', '/api/v1/leave-periods');
  const [adding, setAdding] = useState(false);
  const today = todayIso();
  const rows = [...(periods.data ?? [])].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Leave years. Each balance belongs to one.
        </Text>
        {can(Permission.LEAVE_POLICY_MANAGE) && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setAdding(true)}
            disabled={!periods.data}
          >
            Add leave period
          </Button>
        )}
      </Group>
      {periods.isError && <QueryError error={periods.error} onRetry={() => void periods.refetch()} />}
      {periods.isPending && <Skeleton h={160} />}
      {periods.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconCalendarStats size={22} />} title="No leave periods yet" />
          ) : (
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>From</Table.Th>
                  <Table.Th>To</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((period) => {
                  const current = (period.startDate ?? '') <= today && today <= (period.endDate ?? '');
                  return (
                    <Table.Tr key={period.id}>
                      <Table.Td>
                        <Group gap="xs">
                          <Text size="sm">{period.name}</Text>
                          {current && (
                            <Badge size="sm" variant="light">
                              Current
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>{formatDate(period.startDate)}</Table.Td>
                      <Table.Td>{formatDate(period.endDate)}</Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="light" color={period.status === 'CLOSED' ? 'gray' : 'teal'}>
                          {period.status === 'CLOSED' ? 'Closed' : 'Open'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      )}
      {adding && periods.data && <PeriodModal periods={periods.data} onClose={() => setAdding(false)} />}
    </Stack>
  );
}
