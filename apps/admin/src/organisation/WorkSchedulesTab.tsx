import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { applyFieldErrors, EmptyState, FormError, QueryError, showSuccess } from '@lms/ui';
import {
  Badge,
  Button,
  Card,
  Chip,
  Group,
  Input,
  Modal,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconClockHour9, IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { WeekDay, WorkSchedule } from '../types';
import { WEEK } from './week';

interface ScheduleForm {
  name: string;
  workingDays: WeekDay[];
  defaultSchedule: boolean;
}

function ScheduleModal({ schedule, onClose }: { schedule: WorkSchedule | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ScheduleForm>({
    initialValues: {
      name: schedule?.name ?? '',
      workingDays: schedule?.workingDays ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      defaultSchedule: schedule?.defaultSchedule ?? false,
    },
    validate: {
      name: (value) => (value.trim() ? null : 'Enter a name'),
      workingDays: (value) => (value.length > 0 ? null : 'Pick at least one working day'),
    },
  });
  const create = api.query.useMutation('post', '/api/v1/work-schedules', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/work-schedules/{workScheduleId}', {
    meta: { handlesError: true },
  });

  function submit(values: ScheduleForm) {
    setFormError(null);
    const body = {
      name: values.name.trim(),
      workingDays: values.workingDays,
      defaultSchedule: values.defaultSchedule,
    };
    const options = {
      onSuccess: async () => {
        await invalidate(queryClient, '/api/v1/work-schedules');
        showSuccess(schedule ? 'Work schedule saved.' : 'Work schedule added.');
        onClose();
      },
      onError: (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors)),
    };
    if (schedule?.id) {
      update.mutate({ params: { path: { workScheduleId: schedule.id } }, body }, options);
    } else {
      create.mutate({ body }, options);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={<Text fw={600}>{schedule ? 'Edit work schedule' : 'Add work schedule'}</Text>}
    >
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <FormError message={formError} />
          <TextInput label="Name" required maxLength={100} {...form.getInputProps('name')} data-autofocus />
          <Input.Wrapper
            label="Working days"
            required
            description="Leave is only counted on these days."
            error={form.errors.workingDays}
          >
            <Chip.Group
              multiple
              value={form.values.workingDays}
              onChange={(value) => form.setFieldValue('workingDays', value as WeekDay[])}
            >
              <Group gap={6} mt={6}>
                {WEEK.map(({ day, short }) => (
                  <Chip key={day} value={day} size="sm">
                    {short}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Input.Wrapper>
          <Switch
            label="Default schedule"
            description="For employees and locations without one of their own. Only one schedule is the default."
            {...form.getInputProps('defaultSchedule', { type: 'checkbox' })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {schedule ? 'Save' : 'Add work schedule'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function WorkSchedulesTab() {
  const { can } = useCurrentUser();
  const canManage = can(Permission.ORGANIZATION_MANAGE);
  const schedules = api.query.useQuery('get', '/api/v1/work-schedules');
  const [editing, setEditing] = useState<WorkSchedule | null | undefined>(undefined);
  const rows = [...(schedules.data ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Which days of the week are working days.
        </Text>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Add work schedule
          </Button>
        )}
      </Group>
      {schedules.isError && <QueryError error={schedules.error} onRetry={() => void schedules.refetch()} />}
      {schedules.isPending && <Skeleton h={160} />}
      {schedules.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconClockHour9 size={22} />} title="No work schedules yet" />
          ) : (
            <Table.ScrollContainer minWidth={560}>
              <Table verticalSpacing="sm" highlightOnHover={canManage}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Working days</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((schedule) => (
                    <Table.Tr
                      key={schedule.id}
                      style={canManage ? { cursor: 'pointer' } : undefined}
                      onClick={canManage ? () => setEditing(schedule) : undefined}
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <Text size="sm">{schedule.name}</Text>
                          {schedule.defaultSchedule && (
                            <Badge size="sm" variant="light">
                              Default
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {WEEK.map(({ day, short }) => (
                            <Badge
                              key={day}
                              size="sm"
                              radius="sm"
                              variant={schedule.workingDays?.includes(day) ? 'light' : 'outline'}
                              color={schedule.workingDays?.includes(day) ? undefined : 'gray'}
                              aria-label={`${short}: ${schedule.workingDays?.includes(day) ? 'working' : 'off'}`}
                            >
                              {short}
                            </Badge>
                          ))}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {editing !== undefined && <ScheduleModal schedule={editing} onClose={() => setEditing(undefined)} />}
    </Stack>
  );
}
