import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { ActiveBadge, EmptyState, formatAmount, LeaveTypeLabel, QueryError } from '@lms/ui';
import { Button, Card, Group, Select, Skeleton, Stack, Table, Text } from '@mantine/core';
import { IconFileDescription, IconPlus } from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../runtime';
import { ACCRUAL_LABEL, describeAppliesTo, describeEffective } from './policyRules';
import { useOrgNames } from './useOrgNames';

/** Every policy, by leave type; `?type=` narrows to one. */
export function PoliciesTab() {
  const { can } = useCurrentUser();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const leaveTypeId = search.get('type');
  const policies = api.query.useQuery('get', '/api/v1/leave-policies', {
    params: { query: { leaveTypeId: leaveTypeId ?? undefined } },
  });
  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types', {
    params: { query: { includeInactive: true } },
  });
  const names = useOrgNames();
  const rows = [...(policies.data ?? [])].sort(
    (a, b) =>
      (a.leaveType?.name ?? '').localeCompare(b.leaveType?.name ?? '') ||
      (b.effectiveFrom ?? '').localeCompare(a.effectiveFrom ?? '') ||
      (a.name ?? '').localeCompare(b.name ?? ''),
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Select
          aria-label="Leave type"
          placeholder="Every leave type"
          data={(leaveTypes.data ?? []).map((type) => ({ value: type.id!, label: type.name ?? '' }))}
          value={leaveTypeId}
          onChange={(value) => setSearch(value ? { type: value } : {}, { replace: true })}
          clearable
          w={240}
        />
        {can(Permission.LEAVE_POLICY_MANAGE) && (
          <Button
            component={Link}
            to={`/leave-setup/policies/new${leaveTypeId ? `?type=${leaveTypeId}` : ''}`}
            leftSection={<IconPlus size={16} />}
          >
            Add policy
          </Button>
        )}
      </Group>
      {policies.isError && <QueryError error={policies.error} onRetry={() => void policies.refetch()} />}
      {policies.isPending && <Skeleton h={240} />}
      {policies.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<IconFileDescription size={22} />}
              title="No policies"
              description="Without a policy, nobody is entitled to the leave type."
            />
          ) : (
            <Table.ScrollContainer minWidth={760}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Policy</Table.Th>
                    <Table.Th>Leave type</Table.Th>
                    <Table.Th ta="right">Entitlement</Table.Th>
                    <Table.Th>Applies to</Table.Th>
                    <Table.Th>Effective</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((policy) => (
                    <Table.Tr
                      key={policy.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/leave-setup/policies/${policy.id}`)}
                    >
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {policy.name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <LeaveTypeLabel name={policy.leaveType?.name} color={policy.leaveType?.color} />
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm">{formatAmount(policy.entitlementDays)}</Text>
                        {policy.accrualMethod && (
                          <Text size="xs" c="dimmed">
                            {ACCRUAL_LABEL[policy.accrualMethod]}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td maw={260}>
                        <Text size="sm" lineClamp={2}>
                          {describeAppliesTo(policy.appliesTo, names)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{describeEffective(policy.effectiveFrom, policy.effectiveTo)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <ActiveBadge active={policy.active} />
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
