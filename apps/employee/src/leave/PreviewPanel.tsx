import { errorMessage, isApiError } from '@lms/api';
import { formatAmount, formatDay, formatDays, SESSION_LABEL } from '@lms/ui';
import {
  Alert,
  Badge,
  Card,
  Collapse,
  Group,
  List,
  Loader,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconChevronDown, IconCircleCheck } from '@tabler/icons-react';
import type { LeaveDay, PreviewResponse } from './types';

const DAY_TYPE: Record<NonNullable<LeaveDay['dayType']>, string | null> = {
  WORKING: null,
  WEEKEND: 'Weekend',
  HOLIDAY: 'Holiday',
};

function DayList({ days }: { days: LeaveDay[] }) {
  return (
    <Stack gap={4}>
      {days.map((day) => {
        const offDay = day.dayType ? DAY_TYPE[day.dayType] : null;
        return (
          <Group key={day.date} justify="space-between" wrap="nowrap" gap="xs">
            <Text size="sm" c={offDay && !day.amount ? 'dimmed' : undefined}>
              {day.date && formatDay(day.date)}
            </Text>
            <Group gap={6} wrap="nowrap">
              {offDay && (
                <Badge size="xs" variant="light" color="gray">
                  {offDay}
                </Badge>
              )}
              {day.session && day.session !== 'FULL_DAY' && (
                <Badge size="xs" variant="light">
                  {SESSION_LABEL[day.session]}
                </Badge>
              )}
              <Text size="sm" w={36} ta="right">
                {formatAmount(day.amount)}
              </Text>
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}

/**
 * What the backend says about the request as it stands: how many days it takes, the balance after it,
 * and every rule it breaks - the same evaluation that runs on submit.
 */
export function PreviewPanel({
  ready,
  preview,
  updating,
  error,
  submitError,
}: {
  /** A leave type and both dates are chosen. */
  ready: boolean;
  preview: PreviewResponse | undefined;
  /** The shown preview is for earlier input; a new one is on its way. */
  updating: boolean;
  error: unknown;
  submitError: unknown;
}) {
  const [daysOpened, { toggle: toggleDays }] = useDisclosure(false);
  const submitViolations = isApiError(submitError) ? submitError.violations : [];
  const violations = submitViolations.length ? submitViolations : (preview?.violations ?? []);

  return (
    <Card withBorder padding="lg" style={{ opacity: updating ? 0.6 : 1, transition: 'opacity 150ms' }}>
      <Group justify="space-between" mb="sm">
        <Text fw={600}>Summary</Text>
        {updating && <Loader size="xs" aria-label="Updating" />}
      </Group>

      {!ready && (
        <Text size="sm" c="dimmed">
          Choose a leave type and dates to see how many days this takes.
        </Text>
      )}

      {ready && error != null && !preview && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {errorMessage(error)}
        </Alert>
      )}

      {ready && preview && (
        <Stack gap="md">
          <Group gap="xl">
            <Stack gap={0}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Takes
              </Text>
              <Text fz={28} fw={600} lh={1.2}>
                {formatDays(preview.totalDays)}
              </Text>
            </Stack>
            {preview.available != null && (
              <Stack gap={0}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Balance after
                </Text>
                <Text fz={28} fw={600} lh={1.2} c={(preview.availableAfter ?? 0) < 0 ? 'red' : undefined}>
                  {formatAmount(preview.availableAfter)}
                </Text>
                <Text size="xs" c="dimmed">
                  of {formatAmount(preview.available)} available
                </Text>
              </Stack>
            )}
          </Group>

          {violations.length > 0 ? (
            <Alert
              color="red"
              icon={<IconAlertTriangle size={18} />}
              title="This request can’t be submitted yet"
            >
              <List size="sm" spacing={4}>
                {violations.map((violation) => (
                  <List.Item key={violation.code}>{violation.message}</List.Item>
                ))}
              </List>
            </Alert>
          ) : (
            preview.valid && (
              <Group gap={6} c="teal">
                <IconCircleCheck size={18} />
                <Text size="sm">Ready to submit</Text>
              </Group>
            )
          )}

          {(preview.days?.length ?? 0) > 0 && (
            <Stack gap="xs">
              <UnstyledButton onClick={toggleDays} aria-expanded={daysOpened}>
                <Group gap={4}>
                  <Text size="sm" c="dimmed">
                    {daysOpened ? 'Hide' : 'Show'} day by day
                  </Text>
                  <IconChevronDown
                    size={14}
                    style={{
                      transform: daysOpened ? 'rotate(180deg)' : undefined,
                      transition: 'transform 150ms',
                    }}
                  />
                </Group>
              </UnstyledButton>
              <Collapse expanded={daysOpened}>
                <DayList days={preview.days ?? []} />
              </Collapse>
            </Stack>
          )}
        </Stack>
      )}

      {submitError != null && submitViolations.length === 0 && (
        <Alert color="red" mt="md" icon={<IconAlertTriangle size={18} />} title="Not submitted">
          {errorMessage(submitError)}
        </Alert>
      )}
    </Card>
  );
}
