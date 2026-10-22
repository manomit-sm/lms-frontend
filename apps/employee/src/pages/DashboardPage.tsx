import { Permission, type TenantSchemas } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  EmptyState,
  formatAmount,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDays,
  LeaveStatusBadge,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
} from '@lms/ui';
import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconBeach, IconCalendarPlus, IconHistory, IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { api } from '../runtime';

type Summary = TenantSchemas['schemas']['DashboardSummaryResponse'];

function StatCard({
  label,
  value,
  detail,
  to,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  to?: string;
}) {
  const content = (
    <Card withBorder padding="md" h="100%">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fz={28} fw={600} lh={1.3}>
        {value}
      </Text>
      {detail && (
        <Text size="xs" c="dimmed">
          {detail}
        </Text>
      )}
    </Card>
  );
  return to ? (
    <UnstyledButton component={Link} to={to} h="100%">
      {content}
    </UnstyledButton>
  ) : (
    content
  );
}

function Stats({ summary }: { summary: Summary }) {
  const { can } = useCurrentUser();
  const me = summary.me;
  const team = summary.team;
  return (
    <SimpleGrid cols={{ base: 2, md: 4 }}>
      {me && (
        <>
          <StatCard
            label="Pending requests"
            value={me.pendingRequests ?? 0}
            detail="Waiting for approval"
            to="/leave?status=PENDING"
          />
          <StatCard
            label="Upcoming leave"
            value={me.upcomingLeave?.length ?? 0}
            detail="Requests ahead of you"
            to="/calendar?scope=me"
          />
        </>
      )}
      {can(Permission.LEAVE_APPROVE) && summary.approvals && (
        <StatCard
          label="Approvals waiting"
          value={summary.approvals.pendingTasks ?? 0}
          detail="Assigned to you"
          to="/approvals"
        />
      )}
      {team && (
        <StatCard
          label="Team on leave today"
          value={`${team.onLeaveToday ?? 0} of ${team.headcount ?? 0}`}
          detail={`${team.onLeaveNextSevenDays ?? 0} in the next 7 days`}
          to="/calendar?scope=team"
        />
      )}
    </SimpleGrid>
  );
}

function Balances({ balances }: { balances: NonNullable<Summary['me']>['balances'] }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Title order={4}>Balances</Title>
        <Anchor component={Link} to="/balances" size="sm">
          All balances
        </Anchor>
      </Group>
      {balances?.length ? (
        <SimpleGrid cols={{ base: 2, lg: 4 }}>
          {balances.map((balance) => (
            <Card key={balance.leaveType?.id} withBorder padding="md">
              <LeaveTypeLabel name={balance.leaveType?.name} color={balance.leaveType?.color} />
              <Group gap={6} align="baseline" mt={6}>
                <Text fz={28} fw={600} lh={1.2}>
                  {formatAmount(balance.available)}
                </Text>
                <Text size="sm" c="dimmed">
                  available
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {formatAmount(balance.used)} used
                {balance.pending ? ` · ${formatAmount(balance.pending)} pending` : ''}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Card withBorder>
          <EmptyState title="No balances yet" description="Balances appear once HR allocates leave." />
        </Card>
      )}
    </Stack>
  );
}

function UpcomingLeave({ upcoming }: { upcoming: NonNullable<Summary['me']>['upcomingLeave'] }) {
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="sm">
        Upcoming leave
      </Title>
      {upcoming?.length ? (
        <Stack gap="xs">
          {upcoming.map((leave) => (
            <UnstyledButton
              key={leave.requestId}
              component={Link}
              to={`/leave/${leave.requestId}`}
              py={6}
              aria-label={`${leave.leaveType?.name}, ${formatDateRange(leave.startDate, leave.endDate)}`}
            >
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={2} miw={0}>
                  <LeaveTypeLabel name={leave.leaveType?.name} color={leave.leaveType?.color} />
                  <Text size="xs" c="dimmed">
                    {formatDateRange(leave.startDate, leave.endDate)} · {formatDays(leave.totalDays)}
                  </Text>
                </Stack>
                <LeaveStatusBadge status={leave.status} />
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      ) : (
        <EmptyState
          icon={<IconBeach size={22} />}
          title="Nothing planned"
          description="Approved and pending leave from today on shows up here."
        />
      )}
    </Card>
  );
}

function RecentActivity() {
  const activities = api.query.useQuery('get', '/api/v1/dashboard/activities', {
    params: { query: { limit: 8 } },
  });
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="sm">
        Recent activity
      </Title>
      {activities.isError && (
        <QueryError error={activities.error} onRetry={() => void activities.refetch()} />
      )}
      {activities.isPending && <Skeleton h={120} />}
      {activities.data?.length === 0 && (
        <EmptyState icon={<IconHistory size={22} />} title="No activity yet" />
      )}
      <Stack gap="sm">
        {activities.data?.map((activity) => (
          <Stack key={activity.id} gap={0}>
            <Text size="sm">{activity.summary}</Text>
            <Text size="xs" c="dimmed">
              {formatDateTime(activity.occurredAt)}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}

export function DashboardPage() {
  const user = useCurrentUser();
  const summary = api.query.useQuery('get', '/api/v1/dashboard/summary');
  const firstName = user.me.employee?.firstName;
  const canApply = Boolean(user.me.employee) && user.can(Permission.LEAVE_APPLY);

  return (
    <Stack gap="lg">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome'}
        description={summary.data?.today ? formatDate(summary.data.today, 'long') : undefined}
        actions={
          canApply && (
            <Button component={Link} to="/leave/apply" leftSection={<IconCalendarPlus size={18} />}>
              Apply for leave
            </Button>
          )
        }
      />
      {!user.me.employee && (
        <Alert icon={<IconInfoCircle size={18} />} color="blue" title="No employee record">
          Your account isn’t linked to an employee, so leave features don’t apply to you. HR can link one by
          adding an employee with your email address.
        </Alert>
      )}
      {summary.isError && <QueryError error={summary.error} onRetry={() => void summary.refetch()} />}
      {summary.isPending && <Skeleton h={320} />}
      {summary.data && (
        <>
          <Stats summary={summary.data} />
          {summary.data.me && <Balances balances={summary.data.me.balances} />}
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {summary.data.me && <UpcomingLeave upcoming={summary.data.me.upcomingLeave} />}
            <RecentActivity />
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
