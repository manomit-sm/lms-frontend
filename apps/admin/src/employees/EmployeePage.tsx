import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  applyFieldErrors,
  EMPLOYMENT_TYPE,
  EmploymentStatusBadge,
  formatDate,
  formatDateTime,
  FormError,
  PageHeader,
  QueryError,
  showSuccess,
  todayIso,
} from '@lms/ui';
import { Anchor, Button, Card, Group, Modal, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconArrowLeft, IconDoorExit, IconPencil } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Employee } from '../types';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="sm">{children || '—'}</Text>
    </Stack>
  );
}

function ExitModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [exitDate, setExitDate] = useState<string | null>(todayIso());
  const [formError, setFormError] = useState<string | null>(null);
  const exit = api.query.useMutation('post', '/api/v1/employees/{employeeId}/exit', {
    meta: { handlesError: true },
  });

  return (
    <Modal opened onClose={onClose} title={<Text fw={600}>Exit {employee.fullName}?</Text>}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          exit.mutate(
            { params: { path: { employeeId: employee.id! } }, body: { exitDate: exitDate! } },
            {
              onSuccess: async () => {
                await invalidate(queryClient, '/api/v1/employees', '/api/v1/employees/{employeeId}');
                showSuccess(`${employee.fullName} has exited.`);
                onClose();
              },
              onError: (error) => setFormError(applyFieldErrors(error, () => undefined)),
            },
          );
        }}
      >
        <Stack>
          <Text size="sm">
            Their sign-in is disabled and they can no longer be changed. Anyone reporting to them must be
            given another manager first.
          </Text>
          <FormError message={formError} />
          <DatePickerInput
            label="Last working day"
            required
            valueFormat="D MMM YYYY"
            minDate={employee.joiningDate}
            value={exitDate}
            onChange={setExitDate}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="red" disabled={!exitDate} loading={exit.isPending}>
              Exit employee
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/** One employee's record, with edit and exit for EMPLOYEE_MANAGE. */
export function EmployeePage() {
  const { employeeId = '' } = useParams();
  const { can } = useCurrentUser();
  const [exiting, setExiting] = useState(false);
  const employee = api.query.useQuery('get', '/api/v1/employees/{employeeId}', {
    params: { path: { employeeId } },
  });
  const reports = api.query.useQuery('get', '/api/v1/employees', {
    params: { query: { reportingManagerId: employeeId, size: 50 } },
  });
  const schedules = api.query.useQuery('get', '/api/v1/work-schedules');

  const back = (
    <Anchor
      component={Link}
      to="/employees"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> Employees
    </Anchor>
  );
  if (employee.isError) {
    return (
      <>
        {back}
        <QueryError error={employee.error} onRetry={() => void employee.refetch()} />
      </>
    );
  }
  if (employee.isPending) {
    return <Skeleton h={360} />;
  }

  const data = employee.data;
  const exited = data.employmentStatus === 'EXITED';
  const canManage = can(Permission.EMPLOYEE_MANAGE) && !exited;
  const schedule = schedules.data?.find((candidate) => candidate.id === data.workScheduleId);
  const directReports = (reports.data?.content ?? []).filter(
    (report) => report.employmentStatus !== 'EXITED',
  );

  return (
    <>
      {back}
      <PageHeader
        title={data.fullName ?? ''}
        description={
          <Group gap="sm" component="span">
            <span>{[data.designation?.name, data.department?.name].filter(Boolean).join(' · ')}</span>
            <EmploymentStatusBadge status={data.employmentStatus} />
          </Group>
        }
        actions={
          canManage && (
            <>
              <Button
                variant="default"
                leftSection={<IconDoorExit size={16} />}
                onClick={() => setExiting(true)}
              >
                Exit
              </Button>
              <Button
                component={Link}
                to={`/employees/${data.id}/edit`}
                leftSection={<IconPencil size={16} />}
              >
                Edit
              </Button>
            </>
          )
        }
      />
      <Stack gap="lg">
        <Card withBorder padding="lg">
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
            <Field label="Employee code">{data.employeeCode}</Field>
            <Field label="Email">{data.email}</Field>
            <Field label="Phone">{data.phone}</Field>
            <Field label="Department">{data.department?.name}</Field>
            <Field label="Designation">{data.designation?.name}</Field>
            <Field label="Location">{data.location?.name}</Field>
            <Field label="Reports to">
              {data.reportingManager?.id && (
                <Anchor component={Link} to={`/employees/${data.reportingManager.id}`} size="sm">
                  {data.reportingManager.name}
                </Anchor>
              )}
            </Field>
            <Field label="Work schedule">
              {schedule?.name ?? (data.workScheduleId ? '' : 'Location’s or default')}
            </Field>
            <Field label="Employment">{data.employmentType && EMPLOYMENT_TYPE[data.employmentType]}</Field>
            <Field label="Joined">{formatDate(data.joiningDate)}</Field>
            <Field label="Probation ends">{formatDate(data.probationEndDate)}</Field>
            {data.exitDate && <Field label="Exited">{formatDate(data.exitDate)}</Field>}
          </SimpleGrid>
        </Card>
        <Card withBorder padding="lg">
          <Text fw={600} mb="sm">
            Direct reports
          </Text>
          {directReports.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nobody reports to {data.firstName}.
            </Text>
          ) : (
            <Group gap="xs">
              {directReports.map((report) => (
                <Button
                  key={report.id}
                  component={Link}
                  to={`/employees/${report.id}`}
                  variant="light"
                  size="compact-sm"
                >
                  {report.fullName}
                </Button>
              ))}
            </Group>
          )}
        </Card>
        <Text size="xs" c="dimmed">
          Added {formatDateTime(data.createdAt)} · last changed {formatDateTime(data.updatedAt)}
        </Text>
      </Stack>
      {exiting && <ExitModal employee={data} onClose={() => setExiting(false)} />}
    </>
  );
}
