import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { EmptyState, formatDate, formatDateTime, PageHeader, QueryError } from '@lms/ui';
import {
  Anchor,
  Badge,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { api } from '../runtime';
import { MonthlyChart } from './MonthlyChart';

function Tile({
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
  const card = (
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
      {card}
    </UnstyledButton>
  ) : (
    card
  );
}

function ThisPeriod() {
  const report = api.query.useQuery('get', '/api/v1/reports/monthly-statistics');
  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Leave taken this leave period</Title>
        <Anchor component={Link} to="/reports/monthly" size="sm">
          Reports
        </Anchor>
      </Group>
      {report.isError && <QueryError error={report.error} onRetry={() => void report.refetch()} />}
      {report.isPending && <Skeleton h={200} />}
      {report.data && (
        <MonthlyChart
          months={(report.data.months ?? []).map((month) => ({
            month: month.month ?? '',
            daysTaken: month.daysTaken ?? 0,
            detail: `${month.submitted ?? 0} requested`,
          }))}
        />
      )}
    </Card>
  );
}

function RecentActivity({ full }: { full: boolean }) {
  const activities = api.query.useQuery('get', '/api/v1/dashboard/activities', {
    params: { query: { limit: 10 } },
  });
  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="sm">
        <Title order={4}>Recent activity</Title>
        {full && (
          <Anchor component={Link} to="/audit" size="sm">
            Audit log
          </Anchor>
        )}
      </Group>
      {activities.isError && (
        <QueryError error={activities.error} onRetry={() => void activities.refetch()} />
      )}
      {activities.isPending && <Skeleton h={160} />}
      {activities.data?.length === 0 && <EmptyState icon={<IconHistory size={22} />} title="Nothing yet" />}
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

/** The admin home: the organisation at a glance, for whoever has the reports permission, and the latest changes. */
export function DashboardPage() {
  const user = useCurrentUser();
  const summary = api.query.useQuery('get', '/api/v1/dashboard/summary');
  const canReport = user.canAny([Permission.REPORT_VIEW_ALL, Permission.REPORT_VIEW_TEAM]);
  const team = summary.data?.team;
  const permissions = [...(user.me.permissions ?? [])].sort();

  return (
    <Stack gap="lg">
      <PageHeader
        title="Administration"
        description={[user.me.tenant?.key, summary.data?.today && formatDate(summary.data.today, 'long')]
          .filter(Boolean)
          .join(' · ')}
      />
      {summary.isError && <QueryError error={summary.error} onRetry={() => void summary.refetch()} />}
      {summary.isPending && <Skeleton h={100} />}
      {team && (
        <SimpleGrid cols={{ base: 2, md: 4 }}>
          <Tile
            label={team.scope === 'TENANT' ? 'Employees' : 'In your reporting line'}
            value={team.headcount ?? 0}
            to={
              user.canAny([Permission.EMPLOYEE_VIEW_ALL, Permission.EMPLOYEE_MANAGE])
                ? '/employees'
                : undefined
            }
          />
          <Tile label="On leave today" value={team.onLeaveToday ?? 0} />
          <Tile label="On leave in the next 7 days" value={team.onLeaveNextSevenDays ?? 0} />
          <Tile label="Requests waiting" value={team.pendingRequests ?? 0} detail="Pending approval" />
        </SimpleGrid>
      )}
      <SimpleGrid cols={{ base: 1, lg: canReport ? 2 : 1 }}>
        {canReport && <ThisPeriod />}
        <RecentActivity full={user.can(Permission.AUDIT_VIEW)} />
      </SimpleGrid>
      <Card withBorder padding="lg">
        <Title order={5} mb={4}>
          Your permissions
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          What your roles let you do here. The menu shows the areas they open.
        </Text>
        <Group gap={6}>
          {permissions.map((permission) => (
            <Badge key={permission} variant="outline" color="gray">
              {permission}
            </Badge>
          ))}
        </Group>
      </Card>
    </Stack>
  );
}
