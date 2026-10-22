import { useCurrentUser } from '@lms/auth';
import { formatAmount, formatDateTime, formatDay, formatDays, SESSION_LABEL } from '@lms/ui';
import { Badge, Button, Card, Group, SimpleGrid, Stack, Table, Text, Timeline, Title } from '@mantine/core';
import { IconCheck, IconClock, IconDownload, IconFile, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { resolveUploadUrl } from './attachments';
import { describeSessions } from './sessions';
import type { ApprovalView, LeaveRequestDetail } from './types';
import { api, config } from '../runtime';

// The parts of a leave request's page, shared by the requester's view and the approver's review

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

/** Days, dates and reasons; the employee too when it isn't the viewer's own request. */
export function RequestFacts({
  detail,
  showEmployee,
}: {
  detail: LeaveRequestDetail;
  showEmployee: boolean;
}) {
  const sessions = describeSessions(detail.startDate, detail.endDate, detail.startSession, detail.endSession);
  return (
    <Card withBorder padding="lg">
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="lg">
        {showEmployee && (
          <Field label="Employee">
            <Text>{detail.employee?.name}</Text>
          </Field>
        )}
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
  );
}

export function RequestDays({ detail }: { detail: LeaveRequestDetail }) {
  return (
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
  );
}

/** Nothing when the request has no attachments. */
export function RequestAttachments({ detail }: { detail: LeaveRequestDetail }) {
  const requestId = detail.id ?? '';

  async function download(attachmentId: string) {
    const { data } = await api.client.GET(
      '/api/v1/leave-requests/{requestId}/attachments/{attachmentId}/download',
      { params: { path: { requestId, attachmentId } } },
    );
    if (data?.url) {
      // The URL answers with Content-Disposition: attachment, so the page stays and the file downloads.
      // (A new window opened after the await would be stopped by popup blockers.)
      window.location.assign(resolveUploadUrl(data.url, config.apiBaseUrl));
    }
  }

  if (!detail.attachments?.length) {
    return null;
  }
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="sm">
        Attachments
      </Title>
      <Stack gap="xs">
        {detail.attachments.map((attachment) => (
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

/** Every approval the request went through (the leave itself, then any cancellation), oldest first. */
export function RequestApprovals({ detail }: { detail: LeaveRequestDetail }) {
  const approvals = [...(detail.approvals ?? [])].sort((a, b) =>
    (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  );
  return (
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
  );
}

export function RequestHistory({ detail }: { detail: LeaveRequestDetail }) {
  const { me } = useCurrentUser();
  return (
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
  );
}
