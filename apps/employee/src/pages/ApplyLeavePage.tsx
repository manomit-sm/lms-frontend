import type { TenantSchemas } from '@lms/api';
import { formatAmount, formatDate, PageHeader, QueryError, showSuccess } from '@lms/ui';
import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { attachmentProblem, uploadAttachment } from '../leave/attachments';
import { AttachmentsField, type AttachmentItem } from '../leave/AttachmentsField';
import { policyHints } from '../leave/policyHints';
import { PreviewPanel } from '../leave/PreviewPanel';
import { refreshLeaveData } from '../leave/refresh';
import { FULL_DAYS, toSessions, type SessionChoice } from '../leave/sessions';
import { api, config } from '../runtime';

type Application = TenantSchemas['schemas']['LeaveApplicationRequest'];

/** Sent while the preview query is disabled; never reaches the server. */
const NO_APPLICATION: Application = { leaveTypeId: '', startDate: '', endDate: '' };

let nextAttachmentKey = 0;

export function ApplyLeavePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types');
  const policies = api.query.useQuery('get', '/api/v1/leave-policies/effective');
  const balances = api.query.useQuery('get', '/api/v1/balances');

  const [leaveTypeId, setLeaveTypeId] = useState<string | null>(null);
  const [dates, setDates] = useState<[string | null, string | null]>([null, null]);
  const [sessions, setSessions] = useState<SessionChoice>(FULL_DAYS);
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const eligibleTypes = useMemo(() => {
    const eligible = new Map(
      (policies.data ?? [])
        .filter((entry) => entry.eligible)
        .map((entry) => [entry.leaveTypeId, entry.policy]),
    );
    return (leaveTypes.data ?? []).filter((type) => type.id && eligible.has(type.id));
  }, [leaveTypes.data, policies.data]);
  const availableByType = useMemo(
    () => new Map((balances.data ?? []).map((balance) => [balance.leaveType?.id, balance.available])),
    [balances.data],
  );
  const selectedType = eligibleTypes.find((type) => type.id === leaveTypeId);
  const selectedPolicy = policies.data?.find((entry) => entry.leaveTypeId === leaveTypeId)?.policy;

  const [startDate, endDate] = dates;
  const singleDay = startDate !== null && startDate === endDate;
  const uploadedIds = useMemo(
    () => attachments.flatMap((item) => (item.attachmentId ? [item.attachmentId] : [])),
    [attachments],
  );
  const uploading = attachments.some((item) => item.status === 'uploading');

  // What the request is, without the reason: typing a reason doesn't change the evaluation
  const application = useMemo<Application | null>(() => {
    if (!leaveTypeId || !startDate || !endDate) {
      return null;
    }
    const halfDays = selectedType?.halfDayAllowed ? sessions : FULL_DAYS;
    return {
      leaveTypeId,
      startDate,
      endDate,
      ...toSessions(startDate, endDate, halfDays),
      attachmentIds: uploadedIds,
    };
  }, [leaveTypeId, startDate, endDate, sessions, selectedType?.halfDayAllowed, uploadedIds]);
  const [debouncedApplication] = useDebouncedValue(application, 350);
  const previewIsCurrent = JSON.stringify(application) === JSON.stringify(debouncedApplication);

  const preview = api.query.useQuery(
    'post',
    '/api/v1/leave-requests/preview',
    { body: debouncedApplication ?? NO_APPLICATION },
    { enabled: debouncedApplication !== null, placeholderData: keepPreviousData, retry: false },
  );

  const submit = api.query.useMutation('post', '/api/v1/leave-requests', { meta: { handlesError: true } });
  // A failed submit describes the request as it was; once the request changes, the preview speaks again
  const resetSubmit = submit.reset;
  useEffect(() => resetSubmit(), [application, resetSubmit]);

  function addFiles(files: File[]) {
    for (const file of files) {
      const key = `file-${nextAttachmentKey++}`;
      const problem = attachmentProblem(file);
      const item: AttachmentItem = { key, name: file.name, status: problem ? 'failed' : 'uploading' };
      if (problem) {
        item.error = new Error(problem);
      }
      setAttachments((items) => [...items, item]);
      if (problem) {
        continue;
      }
      uploadAttachment(api, config.apiBaseUrl, file).then(
        (attachmentId) =>
          setAttachments((items) =>
            items.map((current) =>
              current.key === key ? { ...current, status: 'uploaded', attachmentId } : current,
            ),
          ),
        (error: unknown) =>
          setAttachments((items) =>
            items.map((current) => (current.key === key ? { ...current, status: 'failed', error } : current)),
          ),
      );
    }
  }

  async function onSubmit() {
    if (!application) {
      return;
    }
    const data = await submit.mutateAsync({ body: { ...application, reason: reason.trim() || undefined } });
    await refreshLeaveData(queryClient);
    showSuccess(
      data?.status === 'APPROVED'
        ? 'Your leave is approved.'
        : 'Leave requested. Your approver has been told.',
    );
    navigate(data?.id ? `/leave/${data.id}` : '/leave', { replace: true });
  }

  const loading = leaveTypes.isPending || policies.isPending || balances.isPending;
  const loadError = leaveTypes.error ?? policies.error ?? balances.error;
  const canSubmit =
    application !== null &&
    previewIsCurrent &&
    preview.data?.valid === true &&
    !preview.isPlaceholderData &&
    !preview.isFetching &&
    !uploading &&
    !submit.isPending;

  // The message under the leave type: what the user has, and what the policy asks
  const hints = policyHints(selectedType, selectedPolicy ?? undefined);
  const selectedAvailable = leaveTypeId ? availableByType.get(leaveTypeId) : undefined;

  // Beside the form on wide screens, just above the buttons on phones
  const summary = (
    <PreviewPanel
      ready={application !== null}
      preview={preview.data}
      updating={application !== null && (!previewIsCurrent || preview.isFetching)}
      error={preview.error}
      submitError={submit.error}
    />
  );

  return (
    <>
      <PageHeader title="Apply for leave" description="Your approver is told as soon as you submit." />
      {loadError && <QueryError error={loadError} />}
      {loading && !loadError && <Skeleton h={360} />}
      {!loading && !loadError && (
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card withBorder padding="lg">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSubmit().catch(() => undefined);
                }}
              >
                <Stack gap="md">
                  <Select
                    label="Leave type"
                    placeholder="Choose a leave type"
                    required
                    data={eligibleTypes.map((type) => ({ value: type.id!, label: type.name ?? '' }))}
                    renderOption={({ option }) => {
                      const available = availableByType.get(option.value);
                      return (
                        <Group justify="space-between" w="100%" wrap="nowrap">
                          <Text size="sm">{option.label}</Text>
                          {available != null && (
                            <Text size="xs" c="dimmed">
                              {formatAmount(available)} available
                            </Text>
                          )}
                        </Group>
                      );
                    }}
                    value={leaveTypeId}
                    onChange={(value) => {
                      setLeaveTypeId(value);
                      setSessions(FULL_DAYS);
                    }}
                    nothingFoundMessage="No leave types are available to you"
                  />
                  {selectedType && (
                    <Stack gap={6}>
                      {selectedAvailable != null && (
                        <Text size="sm">
                          <b>{formatAmount(selectedAvailable)}</b> days available
                        </Text>
                      )}
                      <Group gap={6}>
                        {hints.map((hint) => (
                          <Badge key={hint} variant="light" color="gray" tt="none" fw={500}>
                            {hint}
                          </Badge>
                        ))}
                      </Group>
                    </Stack>
                  )}

                  <DatePickerInput
                    type="range"
                    allowSingleDateInRange
                    label="Dates"
                    description="Pick the first and last day; pick one day twice for a single day."
                    placeholder="Choose dates"
                    valueFormat="D MMM YYYY"
                    required
                    value={dates}
                    onChange={(value) => {
                      setDates([value[0] ?? null, value[1] ?? null]);
                      setSessions(FULL_DAYS);
                    }}
                  />

                  {selectedType?.halfDayAllowed && startDate && endDate && (
                    <Stack gap={6}>
                      {singleDay ? (
                        <>
                          <Text size="sm" fw={500}>
                            Day
                          </Text>
                          <SegmentedControl
                            value={sessions.singleDay}
                            onChange={(value) =>
                              setSessions({ ...sessions, singleDay: value as SessionChoice['singleDay'] })
                            }
                            data={[
                              { value: 'FULL_DAY', label: 'Full day' },
                              { value: 'FIRST_HALF', label: 'First half' },
                              { value: 'SECOND_HALF', label: 'Second half' },
                            ]}
                          />
                        </>
                      ) : (
                        <>
                          <Switch
                            label={`Start at the second half of ${formatDate(startDate)}`}
                            checked={sessions.startsAtSecondHalf}
                            onChange={(event) =>
                              setSessions({ ...sessions, startsAtSecondHalf: event.currentTarget.checked })
                            }
                          />
                          <Switch
                            label={`End at the first half of ${formatDate(endDate)}`}
                            checked={sessions.endsAtFirstHalf}
                            onChange={(event) =>
                              setSessions({ ...sessions, endsAtFirstHalf: event.currentTarget.checked })
                            }
                          />
                        </>
                      )}
                    </Stack>
                  )}

                  <Textarea
                    label="Reason"
                    description="Optional, seen by your approvers."
                    autosize
                    minRows={2}
                    maxRows={6}
                    value={reason}
                    onChange={(event) => setReason(event.currentTarget.value)}
                  />

                  <AttachmentsField
                    items={attachments}
                    onAdd={addFiles}
                    onRemove={(key) => setAttachments((items) => items.filter((item) => item.key !== key))}
                  />

                  <Box hiddenFrom="md">{summary}</Box>

                  <Group justify="flex-end" mt="sm">
                    <Button variant="default" onClick={() => navigate(-1)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!canSubmit} loading={submit.isPending}>
                      Submit request
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Box visibleFrom="md" style={{ position: 'sticky', top: 72 }}>
              {summary}
            </Box>
          </Grid.Col>
        </Grid>
      )}
    </>
  );
}
