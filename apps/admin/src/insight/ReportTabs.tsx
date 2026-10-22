import {
  EmptyState,
  formatAmount,
  formatDateRange,
  formatDays,
  formatInstantDate,
  LEAVE_STATUS,
  LeaveStatusBadge,
  LeaveTypeLabel,
  QueryError,
  type LeaveStatus,
} from '@lms/ui';
import {
  Card,
  Group,
  Pagination,
  Progress,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { keepPreviousData } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { api } from '../runtime';
import { MonthlyChart } from './MonthlyChart';
import { useReportFilter } from './reportRange';

const PAGE_SIZE = 25;

export interface ReportFilters {
  from?: string;
  to?: string;
}

function Loading({ pending, error, retry }: { pending: boolean; error: unknown; retry: () => void }) {
  if (error) return <QueryError error={error} onRetry={retry} />;
  return pending ? <Skeleton h={260} /> : null;
}

/** A share of the largest value, as a thin meter next to the number (the table carries the figure). */
function Meter({ value, max, color }: { value: number; max: number; color?: string }) {
  return (
    <Progress value={max > 0 ? (value / max) * 100 : 0} color={color} size="sm" radius="xl" aria-hidden />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder padding="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fz={26} fw={600} lh={1.3}>
        {value}
      </Text>
    </Card>
  );
}

const percent = (rate: number | undefined) =>
  rate === undefined || rate === null ? '—' : `${Math.round(rate * 100)}%`;
const hours = (value: number | undefined) =>
  value === undefined || value === null
    ? '—'
    : value < 48
      ? `${formatAmount(value)} h`
      : `${formatAmount(value / 24)} days`;

export function MonthlyTab({ from, to }: ReportFilters) {
  const report = api.query.useQuery('get', '/api/v1/reports/monthly-statistics', {
    params: { query: { from, to } },
  });
  const months = report.data?.months ?? [];
  return (
    <Stack>
      <Loading pending={report.isPending} error={report.error} retry={() => void report.refetch()} />
      {report.data && (
        <>
          <Card withBorder padding="lg">
            <Title order={4} mb="md">
              Leave days taken
            </Title>
            <MonthlyChart
              months={months.map((month) => ({
                month: month.month ?? '',
                daysTaken: month.daysTaken ?? 0,
                detail: `${month.submitted ?? 0} requested · ${month.approved ?? 0} approved · ${month.rejected ?? 0} rejected`,
              }))}
            />
          </Card>
          <Card withBorder padding={0}>
            <Table.ScrollContainer minWidth={560}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Month</Table.Th>
                    <Table.Th ta="right">Days taken</Table.Th>
                    <Table.Th ta="right">Requested</Table.Th>
                    <Table.Th ta="right">Approved</Table.Th>
                    <Table.Th ta="right">Rejected</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {months.map((month) => (
                    <Table.Tr key={month.month}>
                      <Table.Td>{month.month}</Table.Td>
                      <Table.Td ta="right">{formatAmount(month.daysTaken)}</Table.Td>
                      <Table.Td ta="right">{month.submitted}</Table.Td>
                      <Table.Td ta="right">{month.approved}</Table.Td>
                      <Table.Td ta="right">{month.rejected}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </>
      )}
    </Stack>
  );
}

export function DecisionsTab({ from, to }: ReportFilters) {
  const report = api.query.useQuery('get', '/api/v1/reports/decisions', { params: { query: { from, to } } });
  const total = report.data?.total;
  return (
    <Stack>
      <Loading pending={report.isPending} error={report.error} retry={() => void report.refetch()} />
      {report.data && (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <Stat label="Requested" value={String(total?.submitted ?? 0)} />
            <Stat label="Approval rate" value={percent(total?.approvalRate)} />
            <Stat label="Still pending" value={String(total?.pending ?? 0)} />
            <Stat label="Average time to decide" value={hours(total?.averageHoursToDecision)} />
          </SimpleGrid>
          <Card withBorder padding={0}>
            <Table.ScrollContainer minWidth={720}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Leave type</Table.Th>
                    <Table.Th ta="right">Requested</Table.Th>
                    <Table.Th ta="right">Approved</Table.Th>
                    <Table.Th ta="right">Rejected</Table.Th>
                    <Table.Th ta="right">Withdrawn</Table.Th>
                    <Table.Th ta="right">Cancelled</Table.Th>
                    <Table.Th ta="right">Pending</Table.Th>
                    <Table.Th ta="right">Approval rate</Table.Th>
                    <Table.Th ta="right">Time to decide</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(report.data.byLeaveType ?? []).map((row) => (
                    <Table.Tr key={row.leaveType?.id}>
                      <Table.Td>
                        <LeaveTypeLabel name={row.leaveType?.name} color={row.leaveType?.color} />
                      </Table.Td>
                      <Table.Td ta="right">{row.submitted}</Table.Td>
                      <Table.Td ta="right">{row.approved}</Table.Td>
                      <Table.Td ta="right">{row.rejected}</Table.Td>
                      <Table.Td ta="right">{row.withdrawn}</Table.Td>
                      <Table.Td ta="right">{row.cancelled}</Table.Td>
                      <Table.Td ta="right">{row.pending}</Table.Td>
                      <Table.Td ta="right">{percent(row.approvalRate)}</Table.Td>
                      <Table.Td ta="right">{hours(row.averageHoursToDecision)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </>
      )}
    </Stack>
  );
}

export function LeaveTypesTab({ from, to }: ReportFilters) {
  const report = api.query.useQuery('get', '/api/v1/reports/leave-type-usage', {
    params: { query: { from, to } },
  });
  const rows = report.data?.leaveTypes ?? [];
  const max = Math.max(0, ...rows.map((row) => row.daysTaken ?? 0));
  return (
    <Stack>
      <Loading pending={report.isPending} error={report.error} retry={() => void report.refetch()} />
      {report.data && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={600}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Leave type</Table.Th>
                  <Table.Th ta="right">Requests</Table.Th>
                  <Table.Th ta="right">Employees</Table.Th>
                  <Table.Th ta="right">Days taken</Table.Th>
                  <Table.Th w="30%" />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.leaveType?.id}>
                    <Table.Td>
                      <LeaveTypeLabel name={row.leaveType?.name} color={row.leaveType?.color} />
                    </Table.Td>
                    <Table.Td ta="right">{row.requests}</Table.Td>
                    <Table.Td ta="right">{row.employees}</Table.Td>
                    <Table.Td ta="right">{formatAmount(row.daysTaken)}</Table.Td>
                    <Table.Td>
                      <Meter value={row.daysTaken ?? 0} max={max} color={row.leaveType?.color} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </Stack>
  );
}

export function DepartmentsTab({ from, to }: ReportFilters) {
  const report = api.query.useQuery('get', '/api/v1/reports/department-usage', {
    params: { query: { from, to } },
  });
  const rows = report.data?.departments ?? [];
  const max = Math.max(0, ...rows.map((row) => row.averageDaysPerEmployee ?? 0));
  return (
    <Stack>
      <Loading pending={report.isPending} error={report.error} retry={() => void report.refetch()} />
      {report.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconChartBar size={22} />} title="No departments in this report" />
          ) : (
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Department</Table.Th>
                    <Table.Th ta="right">People</Table.Th>
                    <Table.Th ta="right">Days taken</Table.Th>
                    <Table.Th ta="right">Days per person</Table.Th>
                    <Table.Th w="25%" />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row) => (
                    <Table.Tr key={row.departmentId}>
                      <Table.Td>
                        <Text size="sm">{row.departmentName}</Text>
                        {(row.byLeaveType?.length ?? 0) > 0 && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {row.byLeaveType
                              ?.filter((type) => (type.days ?? 0) > 0)
                              .map((type) => `${type.leaveType?.name} ${formatAmount(type.days)}`)
                              .join(' · ')}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td ta="right">{row.headcount}</Table.Td>
                      <Table.Td ta="right">{formatAmount(row.daysTaken)}</Table.Td>
                      <Table.Td ta="right">{formatAmount(row.averageDaysPerEmployee)}</Table.Td>
                      <Table.Td>
                        <Meter value={row.averageDaysPerEmployee ?? 0} max={max} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
    </Stack>
  );
}

type Option = { value: string; label: string };

function usePage(): [number, (page: number) => void] {
  const [search, setSearch] = useSearchParams();
  return [
    Math.max(1, Number(search.get('page')) || 1),
    (page) =>
      setSearch((current) => {
        const next = new URLSearchParams(current);
        next.set('page', String(page));
        return next;
      }),
  ];
}

function useFilterOptions() {
  const departments = api.query.useQuery('get', '/api/v1/departments');
  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types', {
    params: { query: { includeInactive: true } },
  });
  const toOptions = (items: { id?: string; name?: string }[] | undefined): Option[] =>
    (items ?? []).map((item) => ({ value: item.id!, label: item.name ?? '' }));
  return { departments: toOptions(departments.data), leaveTypes: toOptions(leaveTypes.data) };
}

const STATUS_OPTIONS = (Object.keys(LEAVE_STATUS) as LeaveStatus[]).map((status) => ({
  value: status,
  label: LEAVE_STATUS[status].label,
}));

export function HistoryTab({ from, to }: ReportFilters) {
  const [departmentId, setDepartment] = useReportFilter('department');
  const [leaveTypeId, setLeaveType] = useReportFilter('type');
  const [status, setStatus] = useReportFilter('status');
  const [page, setPage] = usePage();
  const options = useFilterOptions();
  const report = api.query.useQuery(
    'get',
    '/api/v1/reports/employee-leave-history',
    {
      params: {
        query: {
          from,
          to,
          departmentId,
          leaveTypeId,
          status: status as LeaveStatus | undefined,
          page: page - 1,
          size: PAGE_SIZE,
        },
      },
    },
    { placeholderData: keepPreviousData },
  );
  const rows = report.data?.content ?? [];
  return (
    <Stack>
      <Group gap="sm">
        <Select
          aria-label="Department"
          placeholder="Any department"
          data={options.departments}
          value={departmentId ?? null}
          onChange={setDepartment}
          clearable
          searchable
          w={200}
        />
        <Select
          aria-label="Leave type"
          placeholder="Any leave type"
          data={options.leaveTypes}
          value={leaveTypeId ?? null}
          onChange={setLeaveType}
          clearable
          w={200}
        />
        <Select
          aria-label="Status"
          placeholder="Any status"
          data={STATUS_OPTIONS}
          value={status ?? null}
          onChange={setStatus}
          clearable
          w={200}
        />
      </Group>
      <Loading pending={report.isPending} error={report.error} retry={() => void report.refetch()} />
      {report.data && (
        <Card withBorder padding={0} style={{ opacity: report.isPlaceholderData ? 0.6 : 1 }}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconChartBar size={22} />} title="No leave matches" />
          ) : (
            <Table.ScrollContainer minWidth={820}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th>Department</Table.Th>
                    <Table.Th>Leave type</Table.Th>
                    <Table.Th>Dates</Table.Th>
                    <Table.Th ta="right">Days</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Requested</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row) => (
                    <Table.Tr key={row.requestId}>
                      <Table.Td>
                        <Text size="sm">{row.employeeName}</Text>
                        <Text size="xs" c="dimmed">
                          {row.employeeCode}
                        </Text>
                      </Table.Td>
                      <Table.Td>{row.departmentName}</Table.Td>
                      <Table.Td>
                        <LeaveTypeLabel name={row.leaveType?.name} color={row.leaveType?.color} />
                      </Table.Td>
                      <Table.Td>{formatDateRange(row.startDate, row.endDate)}</Table.Td>
                      <Table.Td ta="right">{formatDays(row.totalDays)}</Table.Td>
                      <Table.Td>
                        <LeaveStatusBadge status={row.status} />
                      </Table.Td>
                      <Table.Td>{formatInstantDate(row.submittedAt)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {(report.data?.totalPages ?? 0) > 1 && (
        <Group justify="center">
          <Pagination value={page} onChange={setPage} total={report.data?.totalPages ?? 1} />
        </Group>
      )}
    </Stack>
  );
}

export function BalancesTab() {
  const [departmentId, setDepartment] = useReportFilter('department');
  const [leaveTypeId, setLeaveType] = useReportFilter('type');
  const [leavePeriodId, setPeriod] = useReportFilter('period');
  const [page, setPage] = usePage();
  const options = useFilterOptions();
  const periods = api.query.useQuery('get', '/api/v1/leave-periods');
  const report = api.query.useQuery(
    'get',
    '/api/v1/reports/balances',
    { params: { query: { departmentId, leaveTypeId, leavePeriodId, page: page - 1, size: PAGE_SIZE } } },
    { placeholderData: keepPreviousData },
  );
  const rows = report.data?.content ?? [];
  return (
    <Stack>
      <Group gap="sm">
        <Select
          aria-label="Leave period"
          placeholder="Current leave period"
          data={(periods.data ?? []).map((period) => ({ value: period.id!, label: period.name ?? '' }))}
          value={leavePeriodId ?? null}
          onChange={setPeriod}
          clearable
          w={200}
        />
        <Select
          aria-label="Department"
          placeholder="Any department"
          data={options.departments}
          value={departmentId ?? null}
          onChange={setDepartment}
          clearable
          searchable
          w={200}
        />
        <Select
          aria-label="Leave type"
          placeholder="Any leave type"
          data={options.leaveTypes}
          value={leaveTypeId ?? null}
          onChange={setLeaveType}
          clearable
          w={200}
        />
      </Group>
      <Loading pending={report.isPending} error={report.error} retry={() => void report.refetch()} />
      {report.data && (
        <Card withBorder padding={0} style={{ opacity: report.isPlaceholderData ? 0.6 : 1 }}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconChartBar size={22} />} title="No balances match" />
          ) : (
            <Table.ScrollContainer minWidth={860}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th>Leave type</Table.Th>
                    <Table.Th ta="right">Allocated</Table.Th>
                    <Table.Th ta="right">Carried</Table.Th>
                    <Table.Th ta="right">Adjusted</Table.Th>
                    <Table.Th ta="right">Expired</Table.Th>
                    <Table.Th ta="right">Used</Table.Th>
                    <Table.Th ta="right">Pending</Table.Th>
                    <Table.Th ta="right">Available</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row) => (
                    <Table.Tr key={`${row.employeeId}-${row.leaveType?.id}`}>
                      <Table.Td>
                        <Text size="sm">{row.employeeName}</Text>
                        <Text size="xs" c="dimmed">
                          {row.departmentName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <LeaveTypeLabel name={row.leaveType?.name} color={row.leaveType?.color} />
                      </Table.Td>
                      <Table.Td ta="right">{formatAmount(row.allocated)}</Table.Td>
                      <Table.Td ta="right">{formatAmount(row.carriedForward)}</Table.Td>
                      <Table.Td ta="right">{formatAmount(row.adjusted)}</Table.Td>
                      <Table.Td ta="right">{formatAmount(row.expired)}</Table.Td>
                      <Table.Td ta="right">{formatAmount(row.used)}</Table.Td>
                      <Table.Td ta="right">{formatAmount(row.pending)}</Table.Td>
                      <Table.Td ta="right" fw={600}>
                        {formatAmount(row.available)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {(report.data?.totalPages ?? 0) > 1 && (
        <Group justify="center">
          <Pagination value={page} onChange={setPage} total={report.data?.totalPages ?? 1} />
        </Group>
      )}
    </Stack>
  );
}
