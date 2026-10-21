import { useCurrentUser } from '@lms/auth';
import {
  formatAmount,
  formatDateRange,
  formatDateTime,
  formatDay,
  formatDays,
  LeaveStatusBadge,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
  SESSION_LABEL,
  showSuccess,
} from '@lms/ui';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  Timeline,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconCheck, IconClock, IconDownload, IconFile, IconX } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { resolveUploadUrl } from '../leave/attachments';
import { refreshLeaveData } from '../leave/refresh';
import { describeSessions } from '../leave/sessions';
import type { ApprovalView, LeaveRequestDetail } from '../leave/types';
import { api, config } from '../runtime';

type Step = NonNullable<ApprovalView['steps']>[number];
type HistoryEntry = NonNullable<LeaveRequestDetail['history']>[number];

const STEP_STATUS: Record<NonNullable<Step['status']>, { label: string; color: string }> = {
  WAITING: { label: 'Waiting', color: 'gray' },
  PENDING: { label: 'Pending', color: 'yellow' },
  APPROVED: { label: 'Approved', color: 'teal' },
  REJECTED: { label: 'Rejected', color: 'red' },
  SKIPPED: { label: 'Skipped', color: 'gray' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
};

const ACTION_LABEL: Record<NonNullable<HistoryEntry['action']>, string> = {
  SUBMIT: 'Requested',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  WITHDRAW: 'Withdrawn',
  CANCEL: 'Cancelled',
  REQUEST_CANCELLATION: 'Cancellation requested',
  APPROVE_CANCELLATION: 'Cancellation approved',
  REJECT_CANCELLATION: 'Cancellation rejected',
};

/** Today in the browser's calendar, as the API writes dates. */
function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <div>{children}</div>
    </Stack>
  );
}

function ApprovalProgress({ approval }: { approval: ApprovalView }) {
  const steps = [...(approval.steps ?? [])].sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
  const reached = steps.filter((step) => step.status !== 'WAITING').length - 1;
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={500}>
          {approval.subjectType === 'LEAVE_CANCELLATION' ? 'Cancellation approval' : 'Approval'}
        </Text>
        <Text size="xs" c="dimmed">
          {approval.workflowName}
        </Text>
      </Group>
      {steps.length === 0 ? (
        <Text size="sm" c="dimmed">
          No approval was needed.
        </Text>
      ) : (
        <Timeline active={reached} bulletSize={18} lineWidth={2}>
          {steps.map((step) => {
            const status = step.status ? STEP_STATUS[step.status] : undefined;
            return (
              <Timeline.Item
                key={step.taskId ?? step.stepOrder}
                color={status?.color}
                bullet={
                  step.status === 'APPROVED' ? (
                    <IconCheck size={12} />
                  ) : step.status === 'REJECTED' ? (
                    <IconX size={12} />
                  ) : step.status === 'PENDING' ? (
                    <IconClock size={12} />
                  ) : undefined
                }
                title={
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {step.approverDescription}
                    </Text>
                    {status && (
                      <Badge size="xs" variant="light" color={status.color}>
                        {status.label}
                      </Badge>
                    )}
                  </Group>
                }
              >
                {step.actedBy ? (
                  <Text size="xs" c="dimmed">
                    {step.actedBy.name} · {formatDateTime(step.actedAt)}
                  </Text>
                ) : (
                  (step.assignees?.length ?? 0) > 0 && (
                    <Text size="xs" c="dimmed">
                      {step.assignees?.map((assignee) => assignee.name).join(', ')}
                    </Text>
                  )
                )}
                {step.comment && (
                  <Text size="sm" mt={4}>
                    “{step.comment}”
                  </Text>
                )}
              </Timeline.Item>
            );
          })}
        </Timeline>
      )}
    </Stack>
  );
}

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

  async function download(attachmentId: string) {
    const { data } = await api.client.GET(
      '/api/v1/leave-requests/{requestId}/attachments/{attachmentId}/download',
      {
        params: { path: { requestId, attachmentId } },
      },
    );
    if (data?.url) {
      // The URL answers with Content-Disposition: attachment, so the page stays and the file downloads.
      // (A new window opened after the await would be stopped by popup blockers.)
      window.location.assign(resolveUploadUrl(data.url, config.apiBaseUrl));
    }
  }

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
  const started = (detail.startDate ?? '') <= today();
  const sessions = describeSessions(detail.startDate, detail.endDate, detail.startSession, detail.endSession);
  const approvals = [...(detail.approvals ?? [])].sort((a, b) =>
    (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  );

  return (
    <>
      <BackLink />
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
            <Card withBorder padding="lg">
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="lg">
                <Field label="Takes">
                  <Text>{formatDays(detail.totalDays)}</Text>
                  {sessions && (
                    <Text size="xs" c="dimmed">
                      {sessions}
                    </Text>
                  )}
                </Field>
                <Field label="Requested">
                  <Text>{formatDateTime(detail.createdAt)}</Text>
                </Field>
                {!mine && (
                  <Field label="Employee">
                    <Text>{detail.employee?.name}</Text>
                  </Field>
                )}
                {detail.decidedAt && (
                  <Field label="Decided">
                    <Text>{formatDateTime(detail.decidedAt)}</Text>
                  </Field>
                )}
                <Field label="Reason">
                  <Text c={detail.reason ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
                    {detail.reason || 'None given'}
                  </Text>
                </Field>
                {detail.cancellationReason && (
                  <Field label="Cancellation reason">
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{detail.cancellationReason}</Text>
                  </Field>
                )}
              </SimpleGrid>
            </Card>

            <Card withBorder padding="lg">
              <Title order={4} mb="sm">
                Days
              </Title>
              <Table verticalSpacing={6} fz="sm">
                <Table.Tbody>
                  {(detail.days ?? []).map((day) => (
                    <Table.Tr key={day.date}>
                      <Table.Td pl={0}>{day.date && formatDay(day.date)}</Table.Td>
                      <Table.Td>
                        {day.dayType !== 'WORKING' ? (
                          <Badge size="xs" variant="light" color="gray">
                            {day.dayType === 'HOLIDAY' ? 'Holiday' : 'Weekend'}
                          </Badge>
                        ) : (
                          day.session &&
                          day.session !== 'FULL_DAY' && (
                            <Badge size="xs" variant="light">
                              {SESSION_LABEL[day.session]}
                            </Badge>
                          )
                        )}
                      </Table.Td>
                      <Table.Td ta="right" pr={0}>
                        {formatAmount(day.amount)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>

            {(detail.attachments?.length ?? 0) > 0 && (
              <Card withBorder padding="lg">
                <Title order={4} mb="sm">
                  Attachments
                </Title>
                <Stack gap="xs">
                  {detail.attachments?.map((attachment) => (
                    <Group key={attachment.id} justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" miw={0}>
                        <IconFile size={18} />
                        <Text size="sm" truncate>
                          {attachment.fileName}
                        </Text>
                      </Group>
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        leftSection={<IconDownload size={14} />}
                        onClick={() => void download(attachment.id!)}
                      >
                        Download
                      </Button>
                    </Group>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="lg">
            <Card withBorder padding="lg">
              <Stack gap="lg">
                {approvals.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No approval has started.
                  </Text>
                ) : (
                  approvals.map((approval) => <ApprovalProgress key={approval.id} approval={approval} />)
                )}
              </Stack>
            </Card>
            <Card withBorder padding="lg">
              <Title order={4} mb="sm">
                History
              </Title>
              <Stack gap="sm">
                {[...(detail.history ?? [])]
                  .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
                  .map((entry, index) => (
                    <Stack key={`${entry.createdAt}-${index}`} gap={0}>
                      <Text size="sm">
                        {entry.action ? ACTION_LABEL[entry.action] : entry.toStatus}
                        {entry.actorUserId && entry.actorUserId === me.userId ? ' by you' : ''}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDateTime(entry.createdAt)}
                      </Text>
                      {entry.comment && <Text size="sm">“{entry.comment}”</Text>}
                    </Stack>
                  ))}
              </Stack>
            </Card>
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

function BackLink() {
  return (
    <Anchor
      component={Link}
      to="/leave"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> My leave
    </Anchor>
  );
}
