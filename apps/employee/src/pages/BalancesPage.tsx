import {
  EmptyState,
  formatAmount,
  formatDate,
  formatDateTime,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
} from '@lms/ui';
import {
  Button,
  Card,
  Drawer,
  Group,
  Pagination,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconScale } from '@tabler/icons-react';
import { useState } from 'react';
import { availableChange, breakdown } from '../leave/balance';
import type { Balance, BalanceTransaction } from '../leave/types';
import { api } from '../runtime';

const TRANSACTION_LABEL: Record<NonNullable<BalanceTransaction['type']>, string> = {
  ALLOCATION: 'Allocated',
  ACCRUAL: 'Accrued',
  CARRY_FORWARD: 'Carried forward',
  ADJUSTMENT: 'Adjusted by HR',
  EXPIRY: 'Expired',
  CARRY_OUT: 'Carried out',
  HOLD: 'Held for a request',
  RELEASE: 'Released',
  CONSUME: 'Taken (was pending)',
  REVERSAL: 'Returned',
};

function BalanceCard({ balance, onHistory }: { balance: Balance; onHistory: () => void }) {
  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <LeaveTypeLabel name={balance.leaveType?.name} color={balance.leaveType?.color} size="md" />
        <Button variant="subtle" size="compact-sm" onClick={onHistory}>
          History
        </Button>
      </Group>
      <Group gap={6} align="baseline" mt="sm">
        <Text fz={32} fw={600} lh={1.2}>
          {formatAmount(balance.available)}
        </Text>
        <Text c="dimmed">days available</Text>
      </Group>
      <Table mt="sm" withRowBorders={false} verticalSpacing={2} fz="sm">
        <Table.Tbody>
          {breakdown(balance).map((part, index) => (
            <Table.Tr key={part.label}>
              <Table.Td c="dimmed" pl={0}>
                {part.label}
              </Table.Td>
              <Table.Td ta="right" pr={0}>
                {index > 0 && (part.contribution < 0 ? '− ' : '+ ')}
                {formatAmount(Math.abs(part.contribution))}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

const PAGE_SIZE = 20;

function TransactionHistory({ balance }: { balance: Balance }) {
  const [page, setPage] = useState(1);
  const transactions = api.query.useQuery('get', '/api/v1/balances/{balanceId}/transactions', {
    params: {
      path: { balanceId: balance.id! },
      query: { page: page - 1, size: PAGE_SIZE, sort: ['createdAt,desc'] },
    },
  });

  if (transactions.isError) {
    return <QueryError error={transactions.error} onRetry={() => void transactions.refetch()} />;
  }
  if (transactions.isPending) {
    return <Skeleton h={240} />;
  }
  const rows = transactions.data.content ?? [];
  return (
    <Stack>
      {rows.length === 0 ? (
        <EmptyState title="No transactions" />
      ) : (
        <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing="xs" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>When</Table.Th>
                <Table.Th>What</Table.Th>
                <Table.Th ta="right">Change</Table.Th>
                <Table.Th ta="right">Available after</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((transaction) => {
                const change = availableChange(transaction);
                return (
                  <Table.Tr key={transaction.id}>
                    <Table.Td>{formatDateTime(transaction.createdAt)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{transaction.type && TRANSACTION_LABEL[transaction.type]}</Text>
                      {transaction.note && (
                        <Text size="xs" c="dimmed">
                          {transaction.note}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right" c={change < 0 ? 'red' : change > 0 ? 'teal' : 'dimmed'}>
                      {change > 0 ? '+' : change < 0 ? '−' : ''}
                      {change === 0 ? '–' : formatAmount(Math.abs(change))}
                    </Table.Td>
                    <Table.Td ta="right">{formatAmount(transaction.availableAfter)}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {(transactions.data.totalPages ?? 0) > 1 && (
        <Group justify="center">
          <Pagination size="sm" value={page} onChange={setPage} total={transactions.data.totalPages ?? 1} />
        </Group>
      )}
    </Stack>
  );
}

export function BalancesPage() {
  const balances = api.query.useQuery('get', '/api/v1/balances');
  const [historyOf, setHistoryOf] = useState<Balance | null>(null);
  const period = balances.data?.[0]?.leavePeriod;

  return (
    <>
      <PageHeader
        title="Balances"
        description={
          period
            ? `Leave period ${period.name}: ${formatDate(period.startDate)} – ${formatDate(period.endDate)}`
            : 'Your leave in the current leave period'
        }
      />
      {balances.isError && <QueryError error={balances.error} onRetry={() => void balances.refetch()} />}
      {balances.isPending && <Skeleton h={240} />}
      {balances.data?.length === 0 && (
        <Card withBorder>
          <EmptyState
            icon={<IconScale size={22} />}
            title="No balances yet"
            description="Balances appear once HR allocates leave for the current period."
          />
        </Card>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {balances.data?.map((balance) => (
          <BalanceCard key={balance.id} balance={balance} onHistory={() => setHistoryOf(balance)} />
        ))}
      </SimpleGrid>
      <Drawer
        opened={historyOf !== null}
        onClose={() => setHistoryOf(null)}
        position="right"
        size="lg"
        title={<Text fw={600}>{historyOf?.leaveType?.name} history</Text>}
      >
        {historyOf && <TransactionHistory balance={historyOf} />}
      </Drawer>
    </>
  );
}
