import type { TenantSchemas } from '@lms/api';
import { EmptyState, formatDateTime, PageHeader, QueryError } from '@lms/ui';
import {
  ActionIcon,
  Card,
  Code,
  Collapse,
  Group,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconChevronDown, IconChevronRight, IconHistory } from '@tabler/icons-react';
import { keepPreviousData } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { api } from '../runtime';
import { useReportFilter, useReportRange } from './reportRange';

type Activity = TenantSchemas['schemas']['ActivityResponse'];
type Action = NonNullable<Activity['action']>;
type EntityType = NonNullable<Activity['entityType']>;

const PAGE_SIZE = 50;

const ACTIONS: Action[] = [
  'EMPLOYEE_CREATED',
  'EMPLOYEE_EXITED',
  'LEAVE_SUBMITTED',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'LEAVE_WITHDRAWN',
  'LEAVE_CANCELLED',
  'LEAVE_CANCELLATION_REQUESTED',
  'LEAVE_CANCELLATION_APPROVED',
  'LEAVE_CANCELLATION_REJECTED',
  'APPROVAL_STEP_APPROVED',
  'APPROVAL_ESCALATED',
  'BALANCE_ADJUSTED',
  'LEAVE_PERIOD_CLOSED',
];

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'EMPLOYEE', label: 'Employees' },
  { value: 'LEAVE_REQUEST', label: 'Leave requests' },
  { value: 'LEAVE_BALANCE_TRANSACTION', label: 'Balances' },
  { value: 'LEAVE_PERIOD', label: 'Leave periods' },
];

/** "LEAVE_CANCELLATION_REQUESTED" → "Leave cancellation requested". */
const sentence = (code: string) => code.charAt(0) + code.slice(1).toLowerCase().replaceAll('_', ' ');

function Row({ entry }: { entry: Activity }) {
  const [open, setOpen] = useState(false);
  const details = entry.details && Object.keys(entry.details).length > 0 ? entry.details : null;
  return (
    <>
      <Table.Tr>
        <Table.Td w={36} pr={0}>
          {details && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={open ? 'Hide details' : 'Show details'}
              aria-expanded={open}
              onClick={() => setOpen((current) => !current)}
            >
              {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            </ActionIcon>
          )}
        </Table.Td>
        <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.occurredAt)}</Table.Td>
        <Table.Td>
          <Text size="sm">{entry.summary}</Text>
          <Text size="xs" c="dimmed">
            {entry.action && sentence(entry.action)}
          </Text>
        </Table.Td>
        <Table.Td>{entry.actor?.name ?? <Text c="dimmed">System</Text>}</Table.Td>
        <Table.Td>{entry.employee?.name}</Table.Td>
      </Table.Tr>
      {details && (
        <Table.Tr style={{ display: open ? undefined : 'none' }}>
          <Table.Td />
          <Table.Td colSpan={4}>
            <Collapse expanded={open}>
              <Code block>{JSON.stringify(details, null, 2)}</Code>
            </Collapse>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

/** Everything recorded about employees, leave and balances, newest first (AUDIT_VIEW). */
export function AuditPage() {
  const { from, to, setRange } = useReportRange();
  const [picking, setPicking] = useState<[string | null, string | null] | null>(null);
  const [action, setAction] = useReportFilter('action');
  const [entityType, setEntityType] = useReportFilter('entity');
  const [pageParam, setPage] = useReportFilter('page');
  const page = Math.max(1, Number(pageParam) || 1);
  const log = api.query.useQuery(
    'get',
    '/api/v1/audit-logs',
    {
      params: {
        query: {
          from,
          to,
          action: action as Action | undefined,
          entityType: entityType as EntityType | undefined,
          page: page - 1,
          size: PAGE_SIZE,
        },
      },
    },
    { placeholderData: keepPreviousData },
  );
  const rows = log.data?.content ?? [];

  return (
    <>
      <PageHeader title="Audit log" description="Who did what to employees, leave and balances, and when." />
      <Group mb="md" gap="sm">
        <DatePickerInput
          type="range"
          aria-label="Dates"
          placeholder="Any date"
          valueFormat="D MMM YYYY"
          clearable
          value={picking ?? [from ?? null, to ?? null]}
          onChange={(value) => {
            const next: [string | null, string | null] = [value[0] ?? null, value[1] ?? null];
            if ((next[0] && next[1]) || (!next[0] && !next[1])) {
              setPicking(null);
              setRange(next);
            } else {
              setPicking(next);
            }
          }}
          w={260}
        />
        <Select
          aria-label="Action"
          placeholder="Any action"
          data={ACTIONS.map((value) => ({ value, label: sentence(value) }))}
          value={action ?? null}
          onChange={setAction}
          clearable
          searchable
          w={260}
        />
        <Select
          aria-label="Record"
          placeholder="Any record"
          data={ENTITY_TYPES}
          value={entityType ?? null}
          onChange={setEntityType}
          clearable
          w={180}
        />
      </Group>
      {log.isError && <QueryError error={log.error} onRetry={() => void log.refetch()} />}
      {log.isPending && <Skeleton h={320} />}
      {log.data && (
        <Card withBorder padding={0} style={{ opacity: log.isPlaceholderData ? 0.6 : 1 }}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<IconHistory size={22} />}
              title="Nothing recorded"
              description="Try other filters."
            />
          ) : (
            <Table.ScrollContainer minWidth={760}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th />
                    <Table.Th>When</Table.Th>
                    <Table.Th>What</Table.Th>
                    <Table.Th>By</Table.Th>
                    <Table.Th>Employee</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((entry) => (
                    <Fragment key={entry.id}>
                      <Row entry={entry} />
                    </Fragment>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {(log.data?.totalPages ?? 0) > 1 && (
        <Stack align="center" mt="md">
          <Pagination
            value={page}
            onChange={(next) => setPage(String(next))}
            total={log.data?.totalPages ?? 1}
          />
        </Stack>
      )}
    </>
  );
}
