import { applyFieldErrors, formatDateTime, FormError, PageHeader, QueryError, showSuccess } from '@lms/ui';
import { Button, Card, Grid, Group, Select, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Settings } from '../types';

type WeekDay = NonNullable<Settings['weekStartDay']>;

const DAYS: { value: WeekDay; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Date(2000, index, 1).toLocaleDateString(undefined, { month: 'long' }),
}));

const TIMEZONES = Intl.supportedValuesOf('timeZone');

interface SettingsForm {
  organizationName: string;
  logoUrl: string;
  timezone: string | null;
  dateFormat: string | null;
  weekStartDay: WeekDay;
  leaveYearStartMonth: string;
}

function SettingsEditor({ settings, dateFormats }: { settings: Settings; dateFormats: string[] }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SettingsForm>({
    initialValues: {
      organizationName: settings.organizationName ?? '',
      logoUrl: settings.logoUrl ?? '',
      timezone: settings.timezone ?? null,
      dateFormat: settings.dateFormat ?? null,
      weekStartDay: settings.weekStartDay ?? 'MONDAY',
      leaveYearStartMonth: String(settings.leaveYearStartMonth ?? 1),
    },
    validate: {
      logoUrl: (value) => (!value || /^https:\/\/\S+$/.test(value) ? null : 'An https:// address'),
      dateFormat: (value) => (value ? null : 'Pick a date format'),
    },
  });
  const save = api.query.useMutation('put', '/api/v1/settings', { meta: { handlesError: true } });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        setFormError(null);
        save.mutate(
          {
            body: {
              organizationName: values.organizationName.trim() || undefined,
              logoUrl: values.logoUrl.trim() || undefined,
              timezone: values.timezone ?? undefined,
              dateFormat: values.dateFormat!,
              weekStartDay: values.weekStartDay,
              leaveYearStartMonth: Number(values.leaveYearStartMonth),
            },
          },
          {
            onSuccess: async () => {
              await invalidate(queryClient, '/api/v1/settings');
              showSuccess('Settings saved.');
            },
            onError: (error) => setFormError(applyFieldErrors(error, form.setErrors)),
          },
        );
      })}
    >
      <Stack gap="lg" maw={760}>
        <FormError message={formError} />
        <Card withBorder padding="lg">
          <Grid gap="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Organisation name"
                maxLength={150}
                {...form.getInputProps('organizationName')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                label="Logo"
                description="An https:// image address"
                maxLength={500}
                {...form.getInputProps('logoUrl')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Timezone"
                description={`Used for dates and reminders. In use: ${settings.effectiveTimezone ?? '—'}`}
                placeholder="The organisation’s default"
                data={TIMEZONES}
                searchable
                clearable
                limit={50}
                {...form.getInputProps('timezone')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select label="Date format" required data={dateFormats} {...form.getInputProps('dateFormat')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Week starts on"
                required
                data={DAYS}
                allowDeselect={false}
                {...form.getInputProps('weekStartDay')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Leave year starts in"
                required
                data={MONTHS}
                allowDeselect={false}
                {...form.getInputProps('leaveYearStartMonth')}
              />
            </Grid.Col>
          </Grid>
        </Card>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {settings.updatedAt ? `Last changed ${formatDateTime(settings.updatedAt)}` : ''}
          </Text>
          <Button type="submit" loading={save.isPending} disabled={!form.isDirty()}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function SettingsPage() {
  const settings = api.query.useQuery('get', '/api/v1/settings');
  const dateFormats = api.query.useQuery('get', '/api/v1/settings/date-formats');
  const error = settings.error ?? dateFormats.error;
  return (
    <>
      <PageHeader title="Settings" description="How the organisation’s dates and leave years work." />
      {error && (
        <QueryError
          error={error}
          onRetry={() => {
            void settings.refetch();
            void dateFormats.refetch();
          }}
        />
      )}
      {(settings.isPending || dateFormats.isPending) && !error && <Skeleton h={320} maw={760} />}
      {settings.data && dateFormats.data && (
        <SettingsEditor
          key={settings.data.updatedAt}
          settings={settings.data}
          dateFormats={dateFormats.data}
        />
      )}
    </>
  );
}
