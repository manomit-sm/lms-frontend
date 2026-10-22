import { errorMessage } from '@lms/api';
import {
  formatAmount,
  formatDateRange,
  formatDays,
  LeaveStatusBadge,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
  showSuccess,
} from '@lms/ui';
import {
  Alert,
  Anchor,
  Button,
  Card,
  Grid,
  Group,
  Skeleton,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { clampRange } from '../calendar/grid';
import { refreshApprovalData } from '../leave/refresh';
import {
  RequestApprovals,
  RequestAttachments,
  RequestDays,
  RequestFacts,
  RequestHistory,
} from '../leave/RequestSections';
import type { LeaveRequestDetail, PendingApproval } from '../leave/types';
import { api } from '../runtime';

function DecisionCard({ task, detail }: { task: PendingApproval; detail: LeaveRequestDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const approve = api.query.useMutation('post', '/api/v1/approvals/tasks/{taskId}/approve');
  const reject = api.query.useMutation('post', '/api/v1/approvals/tasks/{taskId}/reject');
  const cancellation = task.subjectType === 'LEAVE_CANCELLATION';
  const firstName = detail.employee?.name?.split(' ')[0] ?? 'the employee';
  const busy = approve.isPending || reject.isPending;

  async function decided(message: string) {
    await refreshApprovalData(queryClient);
    showSuccess(message);
    navigate('/approvals');
  }

  // Someone else may have decided first: show the request as it is now
  const onError = () => void refreshApprovalData(queryClient);

  function onApprove() {
    approve.mutate(
      { params: { path: { taskId: task.taskId! } }, body: { comment: comment.trim() || undefined } },
      {
        onSuccess: () =>
          decided(
            cancellation ? `Cancellation approved for ${firstName}.` : `Approved ${firstName}’s leave.`,
          ),
        onError,
      },
    );
  }

  function onReject() {
    if (!comment.trim()) {
      setCommentError(`Say why you are rejecting it; ${firstName} sees your comment.`);
      return;
    }
    reject.mutate(
      { params: { path: { taskId: task.taskId! } }, body: { comment: comment.trim() } },
      {
        onSuccess: () =>
          decided(
            cancellation ? `Cancellation rejected for ${firstName}.` : `Rejected ${firstName}’s leave.`,
          ),
        onError,
      },
    );
  }

  return (
    <Card withBorder padding="lg" style={{ borderColor: 'var(--mantine-primary-color-filled)' }}>
      <Stack gap="sm">
        <Title order={4}>{cancellation ? 'Cancel this leave?' : 'Your decision'}</Title>
        <Text size="sm" c="dimmed">
          {cancellation
            ? `${firstName} asks to cancel leave that has already started. Approving gives the days back; rejecting keeps the leave as it is.`
            : `Step ${task.stepOrder}: ${task.approverDescription}. Approving passes it to the next step, if there is one.`}
        </Text>
        <Textarea
          label="Comment"
          description="Optional when approving, required when rejecting."
          autosize
          minRows={2}
          maxLength={1000}
          value={comment}
          error={commentError}
          onChange={(event) => {
            setComment(event.currentTarget.value);
            setCommentError(null);
          }}
        />
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            color="red"
            leftSection={<IconX size={16} />}
            onClick={onReject}
            loading={reject.isPending}
            disabled={busy && !reject.isPending}
          >
            Reject
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={onApprove}
            loading={approve.isPending}
            disabled={busy && !approve.isPending}
          >
            Approve
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

/** The requester's balance of this leave type; the request's own days are already held in it. */
function BalanceContext({ detail }: { detail: LeaveRequestDetail }) {
  const balances = api.query.useQuery('get', '/api/v1/balances', {
    params: { query: { employeeId: detail.employee?.id, leavePeriodId: detail.leavePeriodId } },
  });
  const balance = balances.data?.find((candidate) => candidate.leaveType?.id === detail.leaveType?.id);
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="xs">
        Balance
      </Title>
      {balances.isPending && <Skeleton h={48} />}
      {balances.isError && (
        <Text size="sm" c="dimmed">
          {errorMessage(balances.error)}
        </Text>
      )}
      {balances.data &&
        (balance ? (
          <>
            <Group gap={6} align="baseline">
              <Text fz={28} fw={600} lh={1.2}>
                {formatAmount(balance.available)}
              </Text>
              <Text size="sm" c="dimmed">
                left after this request
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {formatAmount(balance.used)} used · {formatAmount(balance.pending)} pending, this request
              included
            </Text>
          </>
        ) : (
          <Text size="sm" c="dimmed">
            No {detail.leaveType?.name ?? 'leave'} balance: this type isn’t tracked against an allocation.
          </Text>
        ))}
    </Card>
  );
}

/** Others in the approver's team with leave on any of the requested days. */
function AlsoAway({ detail }: { detail: LeaveRequestDetail }) {
  const calendar = api.query.useQuery('get', '/api/v1/calendar', {
    params: { query: { scope: 'team', ...clampRange(detail.startDate!, detail.endDate!) } },
  });
  const names = new Map((calendar.data?.members ?? []).map((member) => [member.id, member.name]));
  const away = (calendar.data?.leaves ?? []).filter(
    (leave) => leave.employeeId !== detail.employee?.id && leave.timeOff !== false,
  );
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="xs">
        Also away
      </Title>
      {calendar.isPending && <Skeleton h={48} />}
      {calendar.isError && (
        <Text size="sm" c="dimmed">
          {errorMessage(calendar.error)}
        </Text>
      )}
      {calendar.data &&
        (away.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nobody else in your team is away on these days.
          </Text>
        ) : (
          <Stack gap="xs">
            {away.map((leave, index) => (
              <Group key={leave.id ?? `${leave.employeeId}-${index}`} justify="space-between" wrap="nowrap">
                <Stack gap={0} miw={0}>
                  <Text size="sm" fw={500} truncate>
                    {names.get(leave.employeeId) ?? 'Someone'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDateRange(leave.startDate, leave.endDate)}
                    {leave.totalDays !== undefined ? ` · ${formatDays(leave.totalDays)}` : ''}
                    {leave.status === 'PENDING' ? ' · pending' : ''}
                  </Text>
                </Stack>
                {leave.leaveType ? (
                  <LeaveTypeLabel name={leave.leaveType.name} color={leave.leaveType.color} size="xs" />
                ) : (
                  <Text size="xs" c="dimmed">
                    On leave
                  </Text>
                )}
              </Group>
            ))}
          </Stack>
        ))}
    </Card>
  );
}

function BackLink() {
  return (
    <Anchor
      component={Link}
      to="/approvals"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> Approvals
    </Anchor>
  );
}

/**
 * A request as its approver sees it: the decision (while one is waiting for them), the request, and
 * what helps decide - the requester's balance and who else is away. Notifications link here too.
 */
export function ReviewRequestPage() {
  const { requestId = '' } = useParams();
  const pending = api.query.useQuery('get', '/api/v1/leave-requests/pending-approval');
  const request = api.query.useQuery('get', '/api/v1/leave-requests/{requestId}', {
    params: { path: { requestId } },
  });

  if (request.isError || pending.isError) {
    return (
      <>
        <BackLink />
        <QueryError
          error={request.error ?? pending.error}
          onRetry={() => {
            void request.refetch();
            void pending.refetch();
          }}
        />
      </>
    );
  }
  if (request.isPending || pending.isPending) {
    return <Skeleton h={420} />;
  }

  const detail = request.data;
  const task = pending.data.find((candidate) => candidate.leaveRequest?.id === requestId);

  return (
    <>
      <BackLink />
      <PageHeader
        title={detail.employee?.name ?? 'Leave request'}
        description={
          <Group gap="sm" component="span">
            <LeaveTypeLabel name={detail.leaveType?.name} color={detail.leaveType?.color} />
            <span>{formatDateRange(detail.startDate, detail.endDate)}</span>
            <LeaveStatusBadge status={detail.status} />
          </Group>
        }
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            {task ? (
              <DecisionCard key={task.taskId} task={task} detail={detail} />
            ) : (
              <Alert icon={<IconInfoCircle size={18} />} color="blue" title="Nothing waiting for you">
                There is no decision for you to make on this request now: it was decided, withdrawn, or it is
                with another approver.
              </Alert>
            )}
            <RequestFacts detail={detail} showEmployee />
            <RequestDays detail={detail} />
            <RequestAttachments detail={detail} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="lg">
            {task?.subjectType === 'LEAVE_REQUEST' && <BalanceContext detail={detail} />}
            {task && <AlsoAway detail={detail} />}
            <RequestApprovals detail={detail} />
            <RequestHistory detail={detail} />
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
