import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  formatDate,
  formatDay,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
  SESSION_LABEL,
  todayIso,
} from '@lms/ui';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router';
import type { CalendarData } from '../leave/types';
import { api } from '../runtime';
import { AVAILABILITY, AVAILABILITY_ORDER } from './availability';
import { monthDays, parseMonth, shiftMonth } from './grid';
import { LeaveGrid, UNDISCLOSED_COLOR } from './LeaveGrid';
import classes from './LeaveGrid.module.css';

type Scope = 'me' | 'team' | 'department';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'me', label: 'Me' },
  { value: 'team', label: 'Team' },
  { value: 'department', label: 'Department' },
];

function isScope(value: string | null): value is Scope {
  return SCOPES.some((scope) => scope.value === value);
}

/** Leave types in view, then the shading and stripes the grid uses. */
function Legend({ data }: { data: CalendarData }) {
  const types = new Map<string, { name?: string; color?: string }>();
  let undisclosed = false;
  for (const leave of data.leaves ?? []) {
    if (leave.leaveType?.id) {
      types.set(leave.leaveType.id, leave.leaveType);
    } else {
      undisclosed = true;
    }
  }
  return (
    <Group gap="lg" mt="md">
      {[...types.entries()].map(([id, type]) => (
        <LeaveTypeLabel key={id} name={type.name} color={type.color} size="xs" />
      ))}
      {undisclosed && (
        <Group gap={6} wrap="nowrap">
          <span className={classes.swatch} style={{ background: UNDISCLOSED_COLOR }} />
          <Text size="xs">Approved leave</Text>
        </Group>
      )}
      <Group gap={6} wrap="nowrap">
        <span className={classes.swatch} data-pending style={{ backgroundColor: UNDISCLOSED_COLOR }} />
        <Text size="xs">Pending</Text>
      </Group>
      <Group gap={6} wrap="nowrap">
        <span className={classes.swatch} style={{ background: 'var(--mantine-color-grape-light)' }} />
        <Text size="xs">Holiday</Text>
      </Group>
      <Group gap={6} wrap="nowrap">
        <span
          className={classes.swatch}
          style={{ background: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))' }}
        />
        <Text size="xs">Not a working day</Text>
      </Group>
    </Group>
  );
}

function Holidays({ data }: { data: CalendarData }) {
  const holidays = [...(data.holidays ?? [])].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="sm">
        Your holidays this month
      </Title>
      {holidays.length === 0 ? (
        <Text size="sm" c="dimmed">
          None.
        </Text>
      ) : (
        <Stack gap="xs">
          {holidays.map((holiday) => (
            <Group key={holiday.id} justify="space-between" wrap="nowrap">
              <Stack gap={0} miw={0}>
                <Text size="sm" fw={500}>
                  {holiday.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {holiday.date && formatDay(holiday.date)}
                </Text>
              </Stack>
              {holiday.type === 'OPTIONAL' && (
                <Badge size="sm" variant="light" color="gray">
                  Optional
                </Badge>
              )}
            </Group>
          ))}
        </Stack>
      )}
    </Card>
  );
}

function AvailabilityDrawer({
  date,
  scope,
  departmentId,
  onClose,
}: {
  date: string | null;
  scope: Exclude<Scope, 'me'>;
  departmentId: string | undefined;
  onClose: () => void;
}) {
  const availability = api.query.useQuery(
    'get',
    '/api/v1/calendar/availability',
    { params: { query: { date: date ?? '', scope, departmentId } } },
    { enabled: Boolean(date) },
  );
  const employees = [...(availability.data?.employees ?? [])].sort(
    (a, b) => AVAILABILITY_ORDER.indexOf(a.status!) - AVAILABILITY_ORDER.indexOf(b.status!),
  );
  return (
    <Drawer
      opened={Boolean(date)}
      onClose={onClose}
      position="right"
      title={<Text fw={600}>{date ? formatDate(date, 'long') : ''}</Text>}
    >
      {availability.isError && (
        <QueryError error={availability.error} onRetry={() => void availability.refetch()} />
      )}
      {availability.isPending && <Skeleton h={200} />}
      {availability.data && (
        <Stack>
          <Group gap="xs">
            {AVAILABILITY_ORDER.filter((status) => (availability.data.counts?.[status] ?? 0) > 0).map(
              (status) => (
                <Badge key={status} variant="light" color={AVAILABILITY[status].color}>
                  {AVAILABILITY[status].label}: {availability.data.counts?.[status]}
                </Badge>
              ),
            )}
          </Group>
          <Stack gap="sm">
            {employees.map((employee) => (
              <Group key={employee.employeeId} justify="space-between" wrap="nowrap" gap="sm">
                <Stack gap={0} miw={0}>
                  <Text size="sm" fw={500} truncate>
                    {employee.name}
                  </Text>
                  {(employee.leaveType || employee.holidayName || employee.session) && (
                    <Text size="xs" c="dimmed">
                      {[
                        employee.leaveType?.name ?? employee.holidayName,
                        employee.session ? SESSION_LABEL[employee.session] : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </Stack>
                {employee.status && (
                  <Badge
                    variant="light"
                    color={AVAILABILITY[employee.status].color}
                    style={{ flexShrink: 0 }}
                  >
                    {AVAILABILITY[employee.status].label}
                  </Badge>
                )}
              </Group>
            ))}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}

/**
 * Who is away when, a month at a time: just the viewer, their team (reports, manager and peers), or a
 * department. Colleagues outside the viewer's reporting line show approved leave only, without its type.
 */
export function CalendarPage() {
  const { me, can } = useCurrentUser();
  const [search, setSearch] = useSearchParams();
  const today = todayIso();
  const scopeParam = search.get('scope');
  const scope: Scope = isScope(scopeParam) ? scopeParam : 'team';
  const month = parseMonth(search.get('month'), today);
  const departmentId = (scope === 'department' && search.get('department')) || undefined;
  const day = search.get('day');
  const days = monthDays(month);
  const canPickDepartment = can(Permission.EMPLOYEE_VIEW_ALL);

  const calendar = api.query.useQuery(
    'get',
    '/api/v1/calendar',
    { params: { query: { scope, departmentId, from: days[0]!, to: days.at(-1)! } } },
    { placeholderData: (previous) => previous },
  );
  const schedules = api.query.useQuery('get', '/api/v1/work-schedules');
  const schedule =
    schedules.data?.find((candidate) => candidate.id === me.employee?.workScheduleId) ??
    schedules.data?.find((candidate) => candidate.defaultSchedule);
  const departments = api.query.useQuery('get', '/api/v1/departments', {}, { enabled: canPickDepartment });

  function update(changes: Record<string, string | null>) {
    setSearch(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [name, value] of Object.entries(changes)) {
          if (value) {
            next.set(name, value);
          } else {
            next.delete(name);
          }
        }
        return next;
      },
      { replace: true },
    );
  }

  return (
    <>
      <PageHeader title="Calendar" description="Who is away when. Pick a day to see who is available." />
      <Group justify="space-between" mb="md" gap="sm">
        <Group gap="sm">
          <SegmentedControl
            aria-label="Whose leave"
            data={SCOPES}
            value={scope}
            onChange={(value) => update({ scope: value, department: null })}
          />
          {scope === 'department' && canPickDepartment && (
            <Select
              aria-label="Department"
              placeholder="My department"
              data={(departments.data ?? [])
                .filter((department) => department.active !== false)
                .map((department) => ({ value: department.id!, label: department.name ?? '' }))}
              value={departmentId ?? null}
              onChange={(value) => update({ department: value })}
              clearable
              searchable
              w={220}
            />
          )}
        </Group>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Previous month"
            onClick={() => update({ month: shiftMonth(month, -1) })}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Text fw={600} miw={140} ta="center" aria-live="polite">
            {dayjs(`${month}-01`).toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Next month"
            onClick={() => update({ month: shiftMonth(month, 1) })}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
          <Button
            variant="default"
            onClick={() => update({ month: null })}
            disabled={month === today.slice(0, 7)}
          >
            Today
          </Button>
        </Group>
      </Group>

      {calendar.isError && <QueryError error={calendar.error} onRetry={() => void calendar.refetch()} />}
      {calendar.isPending && <Skeleton h={320} />}
      {calendar.data && (
        <Stack gap="lg">
          <Card withBorder padding="md" style={{ opacity: calendar.isPlaceholderData ? 0.6 : 1 }}>
            <LeaveGrid
              members={calendar.data.members ?? []}
              leaves={calendar.data.leaves ?? []}
              holidays={calendar.data.holidays ?? []}
              days={days}
              today={today}
              workingDays={schedule?.workingDays}
              onDayClick={(date) => update({ day: date })}
            />
            <Legend data={calendar.data} />
          </Card>
          <Holidays data={calendar.data} />
        </Stack>
      )}

      <AvailabilityDrawer
        date={day}
        scope={scope === 'me' ? 'team' : scope}
        departmentId={departmentId}
        onClose={() => update({ day: null })}
      />
    </>
  );
}
