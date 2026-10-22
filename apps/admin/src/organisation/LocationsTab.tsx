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
import { IconMapPin, IconPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Location, WorkSchedule } from '../types';

interface LocationForm {
  code: string;
  name: string;
  countryCode: string;
  timezone: string | null;
  workScheduleId: string | null;
  active: boolean;
}

const TIMEZONES = Intl.supportedValuesOf('timeZone');

function LocationModal({
  location,
  schedules,
  onClose,
}: {
  location: Location | null;
  schedules: readonly WorkSchedule[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LocationForm>({
    initialValues: {
      code: location?.code ?? '',
      name: location?.name ?? '',
      countryCode: location?.countryCode ?? '',
      timezone: location?.timezone ?? null,
      workScheduleId: location?.workScheduleId ?? null,
      active: location?.active ?? true,
    },
    validate: {
      code: (value) => (value.trim() ? null : 'Enter a code'),
      name: (value) => (value.trim() ? null : 'Enter a name'),
      countryCode: (value) => (/^[A-Z]{2}$/.test(value) ? null : 'Two letters, e.g. IN or GB'),
      timezone: (value) => (value ? null : 'Pick a timezone'),
    },
  });
  const create = api.query.useMutation('post', '/api/v1/locations', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/locations/{locationId}', {
    meta: { handlesError: true },
  });

  function submit(values: LocationForm) {
    setFormError(null);
    const body = {
      code: values.code.trim(),
      name: values.name.trim(),
      countryCode: values.countryCode,
      timezone: values.timezone!,
      workScheduleId: values.workScheduleId ?? undefined,
      active: values.active,
    };
    const options = {
      onSuccess: async () => {
        await invalidate(queryClient, '/api/v1/locations');
        showSuccess(location ? 'Location saved.' : 'Location added.');
        onClose();
      },
      onError: (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors)),
    };
    if (location?.id) {
      update.mutate({ params: { path: { locationId: location.id } }, body }, options);
    } else {
      create.mutate({ body }, options);
    }
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={<Text fw={600}>{location ? 'Edit location' : 'Add location'}</Text>}
    >
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <FormError message={formError} />
          <Group grow align="flex-start">
            <TextInput label="Code" required maxLength={40} {...form.getInputProps('code')} data-autofocus />
            <TextInput label="Name" required maxLength={150} {...form.getInputProps('name')} />
          </Group>
          <Group grow align="flex-start">
            <TextInput
              label="Country"
              description="ISO code, e.g. IN"
              required
              maxLength={2}
              {...form.getInputProps('countryCode')}
              onChange={(event) => form.setFieldValue('countryCode', event.currentTarget.value.toUpperCase())}
            />
            <Select
              label="Timezone"
              description="For dates and reminders"
              required
              searchable
              data={TIMEZONES}
              limit={50}
              {...form.getInputProps('timezone')}
            />
          </Group>
          <Select
            label="Work schedule"
            description="Working days of employees here, unless they have their own."
            placeholder="The default schedule"
            clearable
            data={schedules.map((schedule) => ({ value: schedule.id!, label: schedule.name ?? '' }))}
            {...form.getInputProps('workScheduleId')}
          />
          <Switch label="Active" {...form.getInputProps('active', { type: 'checkbox' })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {location ? 'Save' : 'Add location'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function LocationsTab() {
  const { can } = useCurrentUser();
  const canManage = can(Permission.ORGANIZATION_MANAGE);
  const locations = api.query.useQuery('get', '/api/v1/locations');
  const schedules = api.query.useQuery('get', '/api/v1/work-schedules');
  const [editing, setEditing] = useState<Location | null | undefined>(undefined);
  const scheduleName = new Map((schedules.data ?? []).map((schedule) => [schedule.id, schedule.name]));
  const rows = [...(locations.data ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Offices and sites. Holidays and working days can differ per location.
        </Text>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
            Add location
          </Button>
        )}
      </Group>
      {locations.isError && <QueryError error={locations.error} onRetry={() => void locations.refetch()} />}
      {locations.isPending && <Skeleton h={200} />}
      {locations.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconMapPin size={22} />} title="No locations yet" />
          ) : (
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing="sm" highlightOnHover={canManage}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>Country</Table.Th>
                    <Table.Th>Timezone</Table.Th>
                    <Table.Th>Work schedule</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((location) => (
                    <Table.Tr
                      key={location.id}
                      style={canManage ? { cursor: 'pointer' } : undefined}
                      onClick={canManage ? () => setEditing(location) : undefined}
                    >
                      <Table.Td>{location.name}</Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {location.code}
                        </Text>
                      </Table.Td>
                      <Table.Td>{location.countryCode}</Table.Td>
                      <Table.Td>{location.timezone}</Table.Td>
                      <Table.Td>
                        {location.workScheduleId ? (
                          scheduleName.get(location.workScheduleId)
                        ) : (
                          <Text size="sm" c="dimmed">
                            Default
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <ActiveBadge active={location.active} />
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
        <LocationModal
          location={editing}
          schedules={schedules.data ?? []}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Stack>
  );
}
