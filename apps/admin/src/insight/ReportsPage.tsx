import { Permission, type TenantSchemas } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { PageHeader } from '@lms/ui';
import { Button, Group, Tabs, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconFiles } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { api } from '../runtime';
import { ExportMenu, ExportsDrawer } from './Exports';
import { useReportFilter, useReportRange } from './reportRange';
import {
  BalancesTab,
  DecisionsTab,
  DepartmentsTab,
  HistoryTab,
  LeaveTypesTab,
  MonthlyTab,
} from './ReportTabs';
import type { ReportName } from './reportLabels';

type LeaveStatus = NonNullable<TenantSchemas['schemas']['ExportRequest']['status']>;

const TABS: { value: string; label: string; report: ReportName; dated: boolean }[] = [
  { value: 'monthly', label: 'By month', report: 'MONTHLY_STATISTICS', dated: true },
  { value: 'leave-types', label: 'Leave types', report: 'LEAVE_TYPE_USAGE', dated: true },
  { value: 'departments', label: 'Departments', report: 'DEPARTMENT_USAGE', dated: true },
  { value: 'decisions', label: 'Decisions', report: 'DECISIONS', dated: true },
  { value: 'history', label: 'Leave history', report: 'EMPLOYEE_LEAVE_HISTORY', dated: true },
  { value: 'balances', label: 'Balances', report: 'BALANCES', dated: false },
];

/**
 * Reports over a date range (default: the current leave period), for the organisation (REPORT_VIEW_ALL)
 * or the reporting line (REPORT_VIEW_TEAM). The range and filters live in the URL; Export uses them.
 */
export function ReportsPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { can } = useCurrentUser();
  const { from, to, setRange } = useReportRange();
  const [picking, setPicking] = useState<[string | null, string | null] | null>(null);
  const [exportsOpen, setExportsOpen] = useState(false);
  const [departmentId] = useReportFilter('department');
  const [leaveTypeId] = useReportFilter('type');
  const [status] = useReportFilter('status');
  const [leavePeriodId] = useReportFilter('period');
  const current = api.query.useQuery('get', '/api/v1/leave-periods/current', {}, { retry: false });
  const active = TABS.find((candidate) => candidate.value === tab);
  if (!active) {
    return <Navigate to="/reports/monthly" replace />;
  }
  const canExport = can(Permission.REPORT_EXPORT);
  const range: [string | null, string | null] = picking ?? [from ?? null, to ?? null];

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          can(Permission.REPORT_VIEW_ALL)
            ? 'For the whole organisation.'
            : 'For the people in your reporting line.'
        }
        actions={
          canExport && (
            <>
              <Button
                variant="subtle"
                leftSection={<IconFiles size={16} />}
                onClick={() => setExportsOpen(true)}
              >
                Your exports
              </Button>
              <ExportMenu
                request={{
                  report: active.report,
                  from: active.dated ? from : undefined,
                  to: active.dated ? to : undefined,
                  departmentId: ['history', 'balances'].includes(active.value) ? departmentId : undefined,
                  leaveTypeId: ['history', 'balances'].includes(active.value) ? leaveTypeId : undefined,
                  status: active.value === 'history' ? (status as LeaveStatus | undefined) : undefined,
                  leavePeriodId: active.value === 'balances' ? leavePeriodId : undefined,
                }}
                onStarted={() => setExportsOpen(true)}
              />
            </>
          )
        }
      />
      <Tabs
        value={active.value}
        onChange={(value) =>
          value && navigate({ pathname: `/reports/${value}`, search: from ? `?from=${from}&to=${to}` : '' })
        }
        keepMounted={false}
      >
        <Group justify="space-between" align="flex-end" mb="lg" gap="sm">
          <Tabs.List>
            {TABS.map(({ value, label }) => (
              <Tabs.Tab key={value} value={value}>
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {active.dated && (
            <Group gap="xs" align="center">
              <DatePickerInput
                type="range"
                aria-label="Dates"
                placeholder={current.data ? `${current.data.name} (current period)` : 'Current leave period'}
                valueFormat="D MMM YYYY"
                clearable
                value={range}
                onChange={(value) => {
                  const next: [string | null, string | null] = [value[0] ?? null, value[1] ?? null];
                  // Apply once both ends are picked, or when cleared
                  if ((next[0] && next[1]) || (!next[0] && !next[1])) {
                    setPicking(null);
                    setRange(next);
                  } else {
                    setPicking(next);
                  }
                }}
                w={280}
              />
              {!from && (
                <Text size="xs" c="dimmed" visibleFrom="md">
                  At most two years
                </Text>
              )}
            </Group>
          )}
        </Group>
        <Tabs.Panel value="monthly">
          <MonthlyTab from={from} to={to} />
        </Tabs.Panel>
        <Tabs.Panel value="leave-types">
          <LeaveTypesTab from={from} to={to} />
        </Tabs.Panel>
        <Tabs.Panel value="departments">
          <DepartmentsTab from={from} to={to} />
        </Tabs.Panel>
        <Tabs.Panel value="decisions">
          <DecisionsTab from={from} to={to} />
        </Tabs.Panel>
        <Tabs.Panel value="history">
          <HistoryTab from={from} to={to} />
        </Tabs.Panel>
        <Tabs.Panel value="balances">
          <BalancesTab />
        </Tabs.Panel>
      </Tabs>
      <ExportsDrawer opened={exportsOpen} onClose={() => setExportsOpen(false)} />
    </>
  );
}
