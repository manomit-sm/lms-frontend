import { EmptyState, EmploymentStatusBadge, initials, PageHeader, QueryError, todayIso } from '@lms/ui';
import { Anchor, Avatar, Badge, Card, Group, Skeleton, Stack, Switch, Table, Text } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AVAILABILITY } from '../calendar/availability';
import { api } from '../runtime';

/** The signed-in manager's reports, with who is in today. `?all=1` adds indirect reports. */
export function TeamPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const includeIndirect = search.get('all') === '1';

  const team = api.query.useQuery('get', '/api/v1/employees/me/team', {
    params: { query: { includeIndirect } },
  });
  // The team calendar covers direct reports (plus manager and peers); indirect reports show no status
  const availability = api.query.useQuery('get', '/api/v1/calendar/availability', {
    params: { query: { date: todayIso(), scope: 'team' } },
  });
  const statusOf = new Map(
    (availability.data?.employees ?? []).map((employee) => [employee.employeeId, employee.status]),
  );
  const members = team.data ?? [];

  return (
    <>
      <PageHeader
        title="Team"
        description="People who report to you, and whether they are in today."
        actions={
          <Switch
            label="Include indirect reports"
            checked={includeIndirect}
            onChange={(event) =>
              setSearch(event.currentTarget.checked ? { all: '1' } : {}, { replace: true })
            }
          />
        }
      />
      {team.isError && <QueryError error={team.error} onRetry={() => void team.refetch()} />}
      {team.isPending && <Skeleton h={240} />}
      {team.data && (
        <Card withBorder padding={0}>
          {members.length === 0 ? (
            <EmptyState
              icon={<IconUsers size={22} />}
              title="Nobody reports to you"
              description="People whose reporting manager you are appear here."
            />
          ) : (
            <Table.ScrollContainer minWidth={720}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Designation</Table.Th>
                    <Table.Th>Department</Table.Th>
                    {includeIndirect && <Table.Th>Reports to</Table.Th>}
                    <Table.Th>Today</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {members.map((member) => {
                    const status = statusOf.get(member.id);
                    return (
                      <Table.Tr
                        key={member.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/team/${member.id}`)}
                      >
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar radius="xl" size={32} color="teal">
                              {initials(member.fullName ?? '')}
                            </Avatar>
                            <Stack gap={0} miw={0}>
                              <Group gap="xs" wrap="nowrap">
                                <Anchor
                                  component={Link}
                                  to={`/team/${member.id}`}
                                  size="sm"
                                  fw={500}
                                  c="inherit"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {member.fullName}
                                </Anchor>
                                {member.employmentStatus !== 'ACTIVE' && (
                                  <EmploymentStatusBadge status={member.employmentStatus} />
                                )}
                              </Group>
                              <Text size="xs" c="dimmed">
                                {member.employeeCode}
                              </Text>
                            </Stack>
                          </Group>
                        </Table.Td>
                        <Table.Td>{member.designation?.name}</Table.Td>
                        <Table.Td>{member.department?.name}</Table.Td>
                        {includeIndirect && <Table.Td>{member.reportingManager?.name}</Table.Td>}
                        <Table.Td>
                          {status ? (
                            <Badge variant="light" color={AVAILABILITY[status].color}>
                              {AVAILABILITY[status].label}
                            </Badge>
                          ) : (
                            <Text size="sm" c="dimmed">
                              —
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
    </>
  );
}
