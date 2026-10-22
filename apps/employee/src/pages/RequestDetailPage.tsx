import { useCurrentUser } from '@lms/auth';
import {
  formatDateRange,
  LeaveStatusBadge,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
  showSuccess,
  todayIso,
} from '@lms/ui';
import { Anchor, Button, Grid, Group, Modal, Skeleton, Stack, Text, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { refreshLeaveData } from '../leave/refresh';
import {
  RequestApprovals,
  RequestAttachments,
  RequestDays,
  RequestFacts,
  RequestHistory,
} from '../leave/RequestSections';
import { api } from '../runtime';

function CancelModal({
  opened,
  needsApproval,
  pending,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  needsApproval: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>{needsApproval ? 'Request cancellation' : 'Cancel leave'}</Text>}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(reason.trim());
        }}
      >
        <Stack>
          <Text size="sm">
            {needsApproval
              ? 'This leave has started, so cancelling it needs approval. Its days stay used until the cancellation is approved.'
              : 'The days go back to your balance straight away.'}
          </Text>
          <Textarea
            label="Reason"
            required
            autosize
            minRows={2}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Keep the leave
            </Button>
            <Button type="submit" color="red" disabled={!reason.trim()} loading={pending}>
              {needsApproval ? 'Request cancellation' : 'Cancel leave'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function RequestDetailPage() {
  const { requestId = '' } = useParams();
  const { me } = useCurrentUser();
  const queryClient = useQueryClient();
  const [cancelOpened, setCancelOpened] = useState(false);

  const request = api.query.useQuery('get', '/api/v1/leave-requests/{requestId}', {
    params: { path: { requestId } },
  });
  const withdraw = api.query.useMutation('post', '/api/v1/leave-requests/{requestId}/withdraw');
  const cancel = api.query.useMutation('post', '/api/v1/leave-requests/{requestId}/cancel');

  function confirmWithdraw() {
    modals.openConfirmModal({
      title: <Text fw={600}>Withdraw this request?</Text>,
      children: <Text size="sm">Your approvers stop seeing it, and its days go back to your balance.</Text>,
      labels: { confirm: 'Withdraw', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        withdraw.mutate(
          { params: { path: { requestId } } },
          {
            onSuccess: async () => {
              await refreshLeaveData(queryClient);
              showSuccess('Request withdrawn.');
            },
          },
        ),
    });
  }

  if (request.isError) {
    return (
      <>
        <BackLink />
        <QueryError error={request.error} onRetry={() => void request.refetch()} />
      </>
    );
  }
  if (request.isPending) {
    return <Skeleton h={420} />;
  }

  const detail = request.data;
  const mine = detail.employee?.id === me.employee?.id;
  const started = (detail.startDate ?? '') <= todayIso();

  return (
    <>
      <BackLink mine={mine} />
      <PageHeader
        title={formatDateRange(detail.startDate, detail.endDate)}
        description={
          <Group gap="sm" component="span">
            <LeaveTypeLabel name={detail.leaveType?.name} color={detail.leaveType?.color} />
            <LeaveStatusBadge status={detail.status} />
          </Group>
        }
        actions={
          mine && (
            <>
              {detail.status === 'PENDING' && (
                <Button variant="default" color="red" onClick={confirmWithdraw} loading={withdraw.isPending}>
                  Withdraw
                </Button>
              )}
              {detail.status === 'APPROVED' && (
                <Button variant="default" onClick={() => setCancelOpened(true)}>
                  {started ? 'Request cancellation' : 'Cancel leave'}
                </Button>
              )}
            </>
          )
        }
      />

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="lg">
            <RequestFacts detail={detail} showEmployee={!mine} />
            <RequestDays detail={detail} />
            <RequestAttachments detail={detail} />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="lg">
            <RequestApprovals detail={detail} />
            <RequestHistory detail={detail} />
          </Stack>
        </Grid.Col>
      </Grid>

      <CancelModal
        opened={cancelOpened}
        needsApproval={started}
        pending={cancel.isPending}
        onClose={() => setCancelOpened(false)}
        onConfirm={(reason) =>
          cancel.mutate(
            { params: { path: { requestId } }, body: { reason } },
            {
              onSuccess: async ({ status }) => {
                setCancelOpened(false);
                await refreshLeaveData(queryClient);
                showSuccess(
                  status === 'CANCELLATION_PENDING'
                    ? 'Cancellation requested. Your approver has been told.'
                    : 'Leave cancelled. The days are back in your balance.',
                );
              },
            },
          )
        }
      />
    </>
  );
}

/** Back to the requester's list, or wherever the viewer came from (team, calendar, notifications). */
function BackLink({ mine = true }: { mine?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const style = { alignItems: 'center', gap: 4 } as const;
  if (mine || location.key === 'default') {
    return (
      <Anchor
        component={Link}
        to={mine ? '/leave' : '/'}
        size="sm"
        mb="sm"
        display="inline-flex"
        style={style}
      >
        <IconArrowLeft size={14} /> {mine ? 'My leave' : 'Dashboard'}
      </Anchor>
    );
  }
  return (
    <Anchor
      component="button"
      type="button"
      onClick={() => navigate(-1)}
      size="sm"
      mb="sm"
      display="inline-flex"
      style={style}
    >
      <IconArrowLeft size={14} /> Back
    </Anchor>
  );
}
