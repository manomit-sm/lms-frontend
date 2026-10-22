import {
  EmptyState,
  EMPLOYMENT_TYPE,
  EmploymentStatusBadge,
  formatAmount,
  formatDate,
  formatDateRange,
  formatDays,
  LeaveStatusBadge,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
} from '@lms/ui';
import { Anchor, Card, Grid, Group, SimpleGrid, Skeleton, Stack, Table, Text, Title } from '@mantine/core';
import { IconArrowLeft, IconListDetails } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import type { Employee } from '../leave/types';
import { api } from '../runtime';

const RECENT_REQUESTS = 10;

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

function Profile({ employee }: { employee: Employee }) {
  return (
    <Card withBorder padding="lg">
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="lg">
        <Field label="Email">{employee.email}</Field>
        <Field label="Employee code">{employee.employeeCode}</Field>
        <Field label="Designation">{employee.designation?.name}</Field>
        <Field label="Department">{employee.department?.name}</Field>
        <Field label="Location">{employee.location?.name}</Field>
        <Field label="Reports to">{employee.reportingManager?.name}</Field>
        <Field label="Employment">
          {employee.employmentType && EMPLOYMENT_TYPE[employee.employmentType]}
        </Field>
        <Field label="Joined">{formatDate(employee.joiningDate)}</Field>
        {employee.probationEndDate && (
          <Field label="Probation ends">{formatDate(employee.probationEndDate)}</Field>
        )}
      </SimpleGrid>
    </Card>
  );
}

function Balances({ employeeId }: { employeeId: string }) {
  const balances = api.query.useQuery('get', '/api/v1/balances', { params: { query: { employeeId } } });
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="sm">
        Balances
      </Title>
      {balances.isError && <QueryError error={balances.error} onRetry={() => void balances.refetch()} />}
      {balances.isPending && <Skeleton h={80} />}
      {balances.data?.length === 0 && (
        <Text size="sm" c="dimmed">
          No balances in the current leave period.
        </Text>
      )}
      <Stack gap="xs">
        {balances.data?.map((balance) => (
          <Group key={balance.id} justify="space-between" wrap="nowrap">
            <LeaveTypeLabel name={balance.leaveType?.name} color={balance.leaveType?.color} />
            <Text size="sm" style={{ flexShrink: 0 }}>
              <Text span fw={600}>
                {formatAmount(balance.available)}
              </Text>{' '}
              <Text span c="dimmed" size="xs">
                left · {formatAmount(balance.used)} used
                {balance.pending ? ` · ${formatAmount(balance.pending)} pending` : ''}
              </Text>
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function RecentRequests({ employeeId }: { employeeId: string }) {
  const requests = api.query.useQuery('get', '/api/v1/leave-requests', {
    params: { query: { employeeId, size: RECENT_REQUESTS } },
  });
  const rows = requests.data?.content ?? [];
  return (
    <Card withBorder padding={0}>
      <Title order={4} p="lg" pb="xs">
        Recent requests
      </Title>
      {requests.isError && <QueryError error={requests.error} onRetry={() => void requests.refetch()} />}
      {requests.isPending && <Skeleton h={160} m="lg" />}
      {requests.data && rows.length === 0 && (
        <EmptyState icon={<IconListDetails size={22} />} title="No requests yet" />
      )}
      {rows.length > 0 && (
        <Table.ScrollContainer minWidth={520}>
          <Table verticalSpacing="sm">
            <Table.Tbody>
              {rows.map((request) => (
                <Table.Tr key={request.id}>
                  <Table.Td pl="lg">
                    <Anchor component={Link} to={`/leave/${request.id}`} size="sm" fw={500}>
                      {formatDateRange(request.startDate, request.endDate)}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <LeaveTypeLabel name={request.leaveType?.name} color={request.leaveType?.color} />
                  </Table.Td>
                  <Table.Td ta="right">{formatDays(request.totalDays)}</Table.Td>
                  <Table.Td pr="lg">
                    <LeaveStatusBadge status={request.status} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}

/** One report: profile, balances and recent leave, for their manager. */
export function TeamMemberPage() {
  const { employeeId = '' } = useParams();
  const employee = api.query.useQuery('get', '/api/v1/employees/{employeeId}', {
    params: { path: { employeeId } },
  });

  const back = (
    <Anchor
      component={Link}
      to="/team"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> Team
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

  return (
    <>
      {back}
      <PageHeader
        title={employee.data.fullName ?? ''}
        description={
          <Group gap="sm" component="span">
            <span>{employee.data.designation?.name}</span>
            <EmploymentStatusBadge status={employee.data.employmentStatus} />
          </Group>
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            <Profile employee={employee.data} />
            <RecentRequests employeeId={employeeId} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Balances employeeId={employeeId} />
        </Grid.Col>
      </Grid>
    </>
  );
}
