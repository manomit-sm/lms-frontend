import { isApiError, Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  applyFieldErrors,
  EmptyState,
  formatDay,
  FormError,
  PageHeader,
  QueriesError,
  showSuccess,
} from '@lms/ui';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  FileInput,
  Group,
  List,
  Modal,
  MultiSelect,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import {
  IconChevronLeft,
  IconChevronRight,
  IconConfetti,
  IconFileImport,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Holiday } from '../types';

type HolidayType = NonNullable<Holiday['type']>;

const HOLIDAY_TYPE: Record<HolidayType, { label: string; color: string; description: string }> = {
  PUBLIC: { label: 'Public', color: 'grape', description: 'A day off for everyone it applies to' },
  COMPANY: { label: 'Company', color: 'blue', description: 'A day off the organisation gives' },
  OPTIONAL: { label: 'Optional', color: 'gray', description: 'Shown in calendars, but a working day' },
};

interface HolidayForm {
  name: string;
  date: string | null;
  type: HolidayType;
  description: string;
  locationIds: string[];
  departmentIds: string[];
}

type Option = { value: string; label: string };

function HolidayModal({
  holiday,
  year,
  locations,
  departments,
  onClose,
}: {
  holiday: Holiday | null;
  year: number;
  locations: Option[];
  departments: Option[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<HolidayForm>({
    initialValues: {
      name: holiday?.name ?? '',
      date: holiday?.date ?? null,
      type: holiday?.type ?? 'PUBLIC',
      description: holiday?.description ?? '',
      locationIds: holiday?.locationIds ?? [],
      departmentIds: holiday?.departmentIds ?? [],
    },
    validate: {
      name: (value) => (value.trim() ? null : 'Enter a name'),
      date: (value) => (value ? null : 'Pick the date'),
    },
  });
  const create = api.query.useMutation('post', '/api/v1/holidays', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/holidays/{holidayId}', {
    meta: { handlesError: true },
  });

  function submit(values: HolidayForm) {
    setFormError(null);
    const body = {
      ...values,
      name: values.name.trim(),
      date: values.date!,
      description: values.description.trim() || undefined,
    };
    const options = {
      onSuccess: async () => {
        await invalidate(queryClient, '/api/v1/holidays');
        showSuccess(holiday ? 'Holiday saved.' : 'Holiday added.');
        onClose();
      },
      onError: (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors)),
    };
    if (holiday?.id) {
      update.mutate({ params: { path: { holidayId: holiday.id } }, body }, options);
    } else {
      create.mutate({ body }, options);
    }
  }

  return (
    <Modal opened onClose={onClose} title={<Text fw={600}>{holiday ? 'Edit holiday' : 'Add holiday'}</Text>}>
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <FormError message={formError} />
          <TextInput label="Name" required maxLength={150} {...form.getInputProps('name')} data-autofocus />
          <Group grow align="flex-start">
            <DatePickerInput
              label="Date"
              required
              valueFormat="ddd, D MMM YYYY"
              defaultDate={`${year}-01-01`}
              {...form.getInputProps('date')}
            />
            <Select
              label="Type"
              required
              data={(Object.keys(HOLIDAY_TYPE) as HolidayType[]).map((value) => ({
                value,
                label: HOLIDAY_TYPE[value].label,
              }))}
              description={HOLIDAY_TYPE[form.values.type].description}
              {...form.getInputProps('type')}
            />
          </Group>
          <MultiSelect
            label="Locations"
            placeholder="Every location"
            data={locations}
            searchable
            {...form.getInputProps('locationIds')}
          />
          <MultiSelect
            label="Departments"
            placeholder="Every department"
            data={departments}
            searchable
            {...form.getInputProps('departmentIds')}
          />
          <Textarea
            label="Description"
            autosize
            minRows={2}
            maxLength={500}
            {...form.getInputProps('description')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {holiday ? 'Save' : 'Add holiday'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<{
    message: string;
    rows: { row?: number; message: string }[];
  } | null>(null);
  const upload = api.query.useMutation('post', '/api/v1/holidays/import', { meta: { handlesError: true } });

  function submit() {
    if (!file) {
      return;
    }
    setProblem(null);
    upload.mutate(
      {
        // The API types a binary part as a string; the serializer sends the File itself
        body: { file: file as unknown as string },
        bodySerializer: (body) => {
          const data = new FormData();
          data.append('file', body?.file as unknown as Blob);
          return data;
        },
      },
      {
        onSuccess: async (result) => {
          await invalidate(queryClient, '/api/v1/holidays');
          showSuccess(
            `Imported ${result.created ?? 0} holiday(s)` +
              (result.skipped ? `; ${result.skipped} already existed and were skipped.` : '.'),
          );
          onClose();
        },
        onError: (error) =>
          setProblem({
            message: isApiError(error) ? error.detail : 'The file could not be imported.',
            rows: isApiError(error) ? error.fieldErrors : [],
          }),
      },
    );
  }

  return (
    <Modal opened onClose={onClose} size="lg" title={<Text fw={600}>Import holidays</Text>}>
      <Stack>
        <Text size="sm">
          A CSV file with a header row. <Code>date</Code> (YYYY-MM-DD) and <Code>name</Code> are required;{' '}
          <Code>type</Code> is PUBLIC, COMPANY or OPTIONAL (PUBLIC when empty); <Code>locations</Code> and{' '}
          <Code>departments</Code> are codes separated by <Code>;</Code> (empty for everyone).
        </Text>
        <Code block>
          {'date,name,type,description,locations,departments\n2026-12-25,Christmas Day,PUBLIC,,BLR;LON,'}
        </Code>
        <Text size="sm" c="dimmed">
          Holidays already there (same date and name) are skipped. If any row is wrong, nothing is imported.
        </Text>
        {problem && (
          <Alert color="red" title={problem.message}>
            {problem.rows.length > 0 && (
              <List size="sm" spacing={2}>
                {problem.rows.map((row, index) => (
                  <List.Item key={index}>
                    {row.row ? `Row ${row.row}: ` : ''}
                    {row.message}
                  </List.Item>
                ))}
              </List>
            )}
          </Alert>
        )}
        <FileInput
          label="File"
          placeholder="Choose a .csv file"
          accept=".csv,text/csv"
          value={file}
          onChange={(value) => {
            setFile(value);
            setProblem(null);
          }}
          clearable
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftSection={<IconFileImport size={16} />}
            disabled={!file}
            loading={upload.isPending}
            onClick={submit}
          >
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/** A year of holidays, filtered by location or department; add, edit, delete and import from CSV. */
export function HolidaysPage() {
  const { can } = useCurrentUser();
  const canManage = can(Permission.HOLIDAY_MANAGE);
  const queryClient = useQueryClient();
  const [search, setSearch] = useSearchParams();
  const year = Number(search.get('year')) || new Date().getFullYear();
  const locationId = search.get('location');
  const departmentId = search.get('department');
  const [editing, setEditing] = useState<Holiday | null | undefined>(undefined);
  const [importing, setImporting] = useState(false);

  const holidays = api.query.useQuery('get', '/api/v1/holidays', {
    params: { query: { year, locationId: locationId ?? undefined, departmentId: departmentId ?? undefined } },
  });
  const locations = api.query.useQuery('get', '/api/v1/locations');
  const departments = api.query.useQuery('get', '/api/v1/departments');
  const remove = api.query.useMutation('delete', '/api/v1/holidays/{holidayId}');
  const toOptions = (items: { id?: string; name?: string }[] | undefined): Option[] =>
    (items ?? []).map((item) => ({ value: item.id!, label: item.name ?? '' }));
  const locationOptions = toOptions(locations.data);
  const departmentOptions = toOptions(departments.data);
  const nameOf = (options: Option[], id: string) =>
    options.find((option) => option.value === id)?.label ?? id;

  function update(changes: Record<string, string | null>) {
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([name, value]) =>
          value ? next.set(name, value) : next.delete(name),
        );
        return next;
      },
      { replace: true },
    );
  }

  function confirmDelete(holiday: Holiday) {
    modals.openConfirmModal({
      title: <Text fw={600}>Delete {holiday.name}?</Text>,
      children: <Text size="sm">This can’t be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        remove.mutate(
          { params: { path: { holidayId: holiday.id! } } },
          {
            onSuccess: async () => {
              await invalidate(queryClient, '/api/v1/holidays');
              showSuccess('Holiday deleted.');
            },
          },
        ),
    });
  }

  const rows = holidays.data ?? [];

  return (
    <>
      <PageHeader
        title="Holidays"
        description="Days off, for everyone or for some locations and departments."
        actions={
          canManage && (
            <>
              <Button
                variant="default"
                leftSection={<IconFileImport size={16} />}
                onClick={() => setImporting(true)}
              >
                Import CSV
              </Button>
              <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing(null)}>
                Add holiday
              </Button>
            </>
          )
        }
      />
      <Group mb="md" gap="sm">
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Previous year"
            onClick={() => update({ year: String(year - 1) })}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text fw={600} w={56} ta="center" aria-live="polite">
            {year}
          </Text>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Next year"
            onClick={() => update({ year: String(year + 1) })}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
        <Select
          aria-label="Location"
          placeholder="Any location"
          data={locationOptions}
          value={locationId}
          onChange={(value) => update({ location: value })}
          clearable
          w={200}
        />
        <Select
          aria-label="Department"
          placeholder="Any department"
          data={departmentOptions}
          value={departmentId}
          onChange={(value) => update({ department: value })}
          clearable
          w={200}
        />
      </Group>
      <QueriesError queries={[holidays, locations, departments]} />
      {holidays.isPending && <Skeleton h={280} />}
      {holidays.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconConfetti size={22} />} title={`No holidays in ${year}`} />
          ) : (
            <Table.ScrollContainer minWidth={680}>
              <Table verticalSpacing="sm" highlightOnHover={canManage}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Holiday</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>For</Table.Th>
                    {canManage && <Table.Th />}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((holiday) => {
                    const scope = [
                      ...(holiday.locationIds ?? []).map((id) => nameOf(locationOptions, id)),
                      ...(holiday.departmentIds ?? []).map((id) => nameOf(departmentOptions, id)),
                    ];
                    return (
                      <Table.Tr
                        key={holiday.id}
                        style={canManage ? { cursor: 'pointer' } : undefined}
                        onClick={canManage ? () => setEditing(holiday) : undefined}
                      >
                        <Table.Td>
                          <Text size="sm">{holiday.date && formatDay(holiday.date)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {holiday.name}
                          </Text>
                          {holiday.description && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {holiday.description}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {holiday.type && (
                            <Badge size="sm" variant="light" color={HOLIDAY_TYPE[holiday.type].color}>
                              {HOLIDAY_TYPE[holiday.type].label}
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td maw={260}>
                          <Text size="sm" c={scope.length ? undefined : 'dimmed'} lineClamp={2}>
                            {scope.length ? scope.join(', ') : 'Everyone'}
                          </Text>
                        </Table.Td>
                        {canManage && (
                          <Table.Td ta="right">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label={`Delete ${holiday.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                confirmDelete(holiday);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Table.Td>
                        )}
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {editing !== undefined && (
        <HolidayModal
          holiday={editing}
          year={year}
          locations={locationOptions}
          departments={departmentOptions}
          onClose={() => setEditing(undefined)}
        />
      )}
      {importing && <ImportModal onClose={() => setImporting(false)} />}
    </>
  );
}
