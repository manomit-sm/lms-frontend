import {
  EmptyState,
  formatDateRange,
  formatDays,
  initials,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
} from '@lms/ui';
import {
  Avatar,
  Badge,
  Box,
  Card,
  Divider,
  Flex,
  Group,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconChecks } from '@tabler/icons-react';
import { Fragment } from 'react';
import { Link } from 'react-router';
import { describeSessions } from '../leave/sessions';
import type { PendingApproval } from '../leave/types';
import { api } from '../runtime';
import { waitingFor } from './waiting';

function TaskRow({ task }: { task: PendingApproval }) {
  const request = task.leaveRequest;
  const cancellation = task.subjectType === 'LEAVE_CANCELLATION';
  const sessions = describeSessions(
    request?.startDate,
    request?.endDate,
    request?.startSession,
    request?.endSession,
  );
  const name = request?.employee?.name ?? '';
  return (
    <UnstyledButton
      component={Link}
      to={`/approvals/${request?.id}`}
      p="md"
      aria-label={`${cancellation ? 'Cancellation' : 'Leave'} from ${name}, ${formatDateRange(request?.startDate, request?.endDate)}`}
    >
      <Flex
        direction={{ base: 'column', xs: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', xs: 'flex-start' }}
        gap={{ base: 6, xs: 'md' }}
      >
        <Group wrap="nowrap" gap="sm" align="flex-start" miw={0}>
          <Avatar radius="xl" color="teal" size={36}>
            {initials(name)}
          </Avatar>
          <Stack gap={2} miw={0}>
            <Group gap="xs">
              <Text fw={500}>{name}</Text>
              {cancellation && (
                <Badge size="sm" variant="light" color="orange">
                  Cancellation
                </Badge>
              )}
            </Group>
            <LeaveTypeLabel name={request?.leaveType?.name} color={request?.leaveType?.color} />
            <Text size="sm" c="dimmed">
              {formatDateRange(request?.startDate, request?.endDate)} · {formatDays(request?.totalDays)}
              {sessions ? ` · ${sessions}` : ''}
            </Text>
          </Stack>
        </Group>
        {/* Beside the request on wider screens, under it (aligned with the name) on phones */}
        <Box ta={{ base: 'left', xs: 'right' }} pl={{ base: 48, xs: 0 }} style={{ flexShrink: 0 }}>
          <Text size="sm">Waiting {waitingFor(task.assignedAt)}</Text>
          <Text size="xs" c="dimmed">
            Step {task.stepOrder} · {task.approverDescription}
          </Text>
        </Box>
      </Flex>
    </UnstyledButton>
  );
}

/** Decisions waiting for the signed-in user: leave requests and cancellations, longest waiting first. */
export function ApprovalsPage() {
  const pending = api.query.useQuery('get', '/api/v1/leave-requests/pending-approval');
  const tasks = [...(pending.data ?? [])].sort((a, b) =>
    (a.assignedAt ?? '').localeCompare(b.assignedAt ?? ''),
  );

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Requests waiting for your decision, longest waiting first."
      />
      {pending.isError && <QueryError error={pending.error} onRetry={() => void pending.refetch()} />}
      {pending.isPending && <Skeleton h={240} />}
      {pending.data && (
        <Card withBorder padding={0}>
          {tasks.length === 0 ? (
            <EmptyState
              icon={<IconChecks size={22} />}
              title="You’re all caught up"
              description="Requests that need your decision appear here, and you get a notification for each."
            />
          ) : (
            <Stack gap={0}>
              {tasks.map((task, index) => (
                <Fragment key={task.taskId}>
                  {index > 0 && <Divider />}
                  <TaskRow task={task} />
                </Fragment>
              ))}
            </Stack>
          )}
        </Card>
      )}
    </>
  );
}
