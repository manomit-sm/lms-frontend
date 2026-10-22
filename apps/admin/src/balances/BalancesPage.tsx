import {
  applyFieldErrors,
  formatAmount,
  FormError,
  LeaveTypeLabel,
  PageHeader,
  QueriesError,
  QueryError,
  showSuccess,
} from '@lms/ui';
import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { IconCheck, IconPlusMinus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { EmployeeSelect } from '../employees/EmployeeSelect';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Balance } from '../types';

const BALANCE_PATHS = [
  '/api/v1/balances',
  '/api/v1/balances/{balanceId}/transactions',
  '/api/v1/reports/balances',
];

function Allocate() {
  const queryClient = useQueryClient();
  const periods = api.query.useQuery('get', '/api/v1/leave-periods');
  const current = api.query.useQuery('get', '/api/v1/leave-periods/current', {}, { retry: false });
  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types');
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const allocate = api.query.useMutation('post', '/api/v1/balances/allocations', {
    meta: { handlesError: true },
  });
  const tracked = (leaveTypes.data ?? []).filter((type) => type.balanceTracked && type.active !== false);
  const chosenPeriod = periodId ?? current.data?.id ?? null;

  return (
    <Card withBorder padding="lg">
      <Title order={4}>Allocate a leave period</Title>
      <Text size="sm" c="dimmed" mb="md">
        Gives every current employee their entitlement for the period, as their policies say. Running it again
        only allocates what is missing, e.g. for new joiners or new leave types.
      </Text>
      <Stack>
        <QueriesError queries={[periods, leaveTypes]} />
        <FormError message={formError} />
        {allocate.data && (
          <Alert color="teal" icon={<IconCheck size={18} />}>
            {allocate.data.balancesAllocated} balance(s) allocated across {allocate.data.employees}{' '}
            employee(s); {allocate.data.alreadyAllocated} were already allocated.
          </Alert>
        )}
        <Group grow align="flex-start">
          <Select
            label="Leave period"
            data={(periods.data ?? []).map((period) => ({
              value: period.id!,
              label: `${period.name}${period.id === current.data?.id ? ' (current)' : ''}`,
              disabled: period.status === 'CLOSED',
            }))}
            value={chosenPeriod}
            onChange={setPeriodId}
            allowDeselect={false}
          />
          <MultiSelect
            label="Leave types"
            placeholder={typeIds.length ? undefined : 'Every tracked leave type'}
            data={tracked.map((type) => ({ value: type.id!, label: type.name ?? '' }))}
            value={typeIds}
            onChange={setTypeIds}
            clearable
          />
        </Group>
        <Group justify="flex-end">
          <Button
            disabled={!chosenPeriod}
            loading={allocate.isPending}
            onClick={() => {
              setFormError(null);
              allocate.mutate(
                {
                  body: { leavePeriodId: chosenPeriod!, leaveTypeIds: typeIds.length ? typeIds : undefined },
                },
                {
                  onSuccess: () => invalidate(queryClient, ...BALANCE_PATHS),
                  onError: (error) => setFormError(applyFieldErrors(error, () => undefined)),
                },
              );
            }}
          >
            Allocate
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function AdjustModal({
  balance,
  employeeName,
  onClose,
}: {
  balance: Balance;
  employeeName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<number | string>('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const adjust = api.query.useMutation('post', '/api/v1/balances/adjustments', {
    meta: { handlesError: true },
  });
  const value = typeof amount === 'number' ? amount : 0;
  const valid = value !== 0 && reason.trim().length > 0;

  return (
    <Modal opened onClose={onClose} title={<Text fw={600}>Adjust {balance.leaveType?.name}</Text>}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          adjust.mutate(
            {
              body: {
                employeeId: balance.employeeId!,
                leaveTypeId: balance.leaveType!.id!,
                leavePeriodId: balance.leavePeriod?.id,
                amount: value,
                reason: reason.trim(),
              },
            },
            {
              onSuccess: async (updated) => {
                await invalidate(queryClient, ...BALANCE_PATHS);
                showSuccess(
                  `${employeeName} now has ${formatAmount(updated.available)} days of ${balance.leaveType?.name}.`,
                );
                onClose();
              },
              onError: (error) => setFormError(applyFieldErrors(error, () => undefined)),
            },
          );
        }}
      >
        <Stack>
          <Text size="sm">
            {employeeName} has {formatAmount(balance.available)} days available. The change and its reason are
            recorded in the balance’s history, and {employeeName.split(' ')[0]} is told.
          </Text>
          <FormError message={formError} />
          <NumberInput
            label="Days"
            description="Positive to add, negative to remove"
            required
            min={-365}
            max={365}
            step={0.5}
            decimalScale={1}
            value={amount}
            onChange={setAmount}
            data-autofocus
          />
          <Textarea
            label="Reason"
            required
            autosize
            minRows={2}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          {value !== 0 && (
            <Text size="sm" c="dimmed">
              Available after: {formatAmount((balance.available ?? 0) + value)} days
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid} loading={adjust.isPending}>
              Adjust
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function EmployeeBalances() {
  const [search, setSearch] = useSearchParams();
  const employeeId = search.get('employee');
  const [adjusting, setAdjusting] = useState<Balance | null>(null);
  const employee = api.query.useQuery(
    'get',
    '/api/v1/employees/{employeeId}',
    { params: { path: { employeeId: employeeId ?? '' } } },
    { enabled: Boolean(employeeId) },
  );
  const balances = api.query.useQuery(
    'get',
    '/api/v1/balances',
    { params: { query: { employeeId: employeeId ?? undefined } } },
    { enabled: Boolean(employeeId) },
  );
  const name = employee.data?.fullName ?? 'The employee';

  return (
    <Card withBorder padding="lg">
      <Title order={4}>An employee’s balances</Title>
      <Text size="sm" c="dimmed" mb="md">
        This leave period’s balances, and adjustments: a correction, or days granted for overtime.
      </Text>
      <Stack>
        <EmployeeSelect
          key={employee.data?.id ?? 'none'}
          label="Employee"
          value={employeeId}
          selected={employee.data?.id ? { id: employee.data.id, name: employee.data.fullName ?? '' } : null}
          onChange={(value) => {
            setSearch(value ? { employee: value } : {}, { replace: true });
          }}
        />
        {balances.isError && <QueryError error={balances.error} onRetry={() => void balances.refetch()} />}
        {employeeId && balances.isPending && <Skeleton h={160} />}
        {balances.data?.length === 0 && (
          <Text size="sm" c="dimmed">
            No balances this period. Allocate the period first.
          </Text>
        )}
        {(balances.data?.length ?? 0) > 0 && (
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Leave type</Table.Th>
                  <Table.Th ta="right">Allocated</Table.Th>
                  <Table.Th ta="right">Carried</Table.Th>
                  <Table.Th ta="right">Adjusted</Table.Th>
                  <Table.Th ta="right">Used</Table.Th>
                  <Table.Th ta="right">Pending</Table.Th>
                  <Table.Th ta="right">Available</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {balances.data?.map((balance) => (
                  <Table.Tr key={balance.id}>
                    <Table.Td>
                      <LeaveTypeLabel name={balance.leaveType?.name} color={balance.leaveType?.color} />
                    </Table.Td>
                    <Table.Td ta="right">{formatAmount(balance.allocated)}</Table.Td>
                    <Table.Td ta="right">{formatAmount(balance.carriedForward)}</Table.Td>
                    <Table.Td ta="right">{formatAmount(balance.adjusted)}</Table.Td>
                    <Table.Td ta="right">{formatAmount(balance.used)}</Table.Td>
                    <Table.Td ta="right">{formatAmount(balance.pending)}</Table.Td>
                    <Table.Td ta="right" fw={600}>
                      {formatAmount(balance.available)}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Button
                        size="compact-sm"
                        variant="light"
                        leftSection={<IconPlusMinus size={14} />}
                        onClick={() => setAdjusting(balance)}
                      >
                        Adjust
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
      {adjusting && (
        <AdjustModal balance={adjusting} employeeName={name} onClose={() => setAdjusting(null)} />
      )}
    </Card>
  );
}

/** Allocating a period's balances, and adjusting one employee's. */
export function BalancesPage() {
  return (
    <>
      <PageHeader title="Balances" description="Allocate leave periods and adjust individual balances." />
      <Stack gap="lg">
        <Allocate />
        <EmployeeBalances />
      </Stack>
    </>
  );
}
