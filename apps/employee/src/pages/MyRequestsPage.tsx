import { useCurrentUser } from '@lms/auth';
import {
  EmptyState,
  formatDateRange,
  formatDays,
  formatInstantDate,
  LEAVE_STATUS,
  LeaveStatusBadge,
  LeaveTypeLabel,
  PageHeader,
  QueryError,
  type LeaveStatus,
} from '@lms/ui';
import { Anchor, Button, Card, Group, Pagination, Select, Skeleton, Table, Text } from '@mantine/core';
import { IconCalendarPlus, IconListDetails } from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { describeSessions } from '../leave/sessions';
import { api } from '../runtime';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = (Object.keys(LEAVE_STATUS) as LeaveStatus[]).map((status) => ({
  value: status,
  label: LEAVE_STATUS[status].label,
}));

function isStatus(value: string | null): value is LeaveStatus {
  return value !== null && value in LEAVE_STATUS;
}

/** The signed-in employee's requests, newest first. Filters and page live in the URL, so links can set them. */
export function MyRequestsPage() {
  const { me } = useCurrentUser();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const status = search.get('status');
  const leaveTypeId = search.get('type');
  const page = Math.max(1, Number(search.get('page')) || 1);

  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types', {
    params: { query: { includeInactive: true } },
  });
  const requests = api.query.useQuery('get', '/api/v1/leave-requests', {
    params: {
      query: {
        employeeId: me.employee?.id,
        status: isStatus(status) ? status : undefined,
        leaveTypeId: leaveTypeId ?? undefined,
        page: page - 1,
        size: PAGE_SIZE,
      },
    },
  });

  function setFilter(name: string, value: string | null) {
    setSearch((current) => {
      const next = new URLSearchParams(current);
      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }
      if (name !== 'page') {
        next.delete('page');
      }
      return next;
    });
  }

  const rows = requests.data?.content ?? [];
  const filtered = Boolean(status || leaveTypeId);

  return (
    <>
      <PageHeader
        title="My leave"
        description="Every request you have made, newest first."
        actions={
          <Button component={Link} to="/leave/apply" leftSection={<IconCalendarPlus size={18} />}>
            Apply for leave
          </Button>
        }
      />
      <Group mb="md" gap="sm">
        <Select
          aria-label="Status"
          placeholder="Any status"
          data={STATUS_OPTIONS}
          value={isStatus(status) ? status : null}
          onChange={(value) => setFilter('status', value)}
          clearable
          w={200}
        />
        <Select
          aria-label="Leave type"
          placeholder="Any leave type"
          data={(leaveTypes.data ?? []).map((type) => ({ value: type.id!, label: type.name ?? '' }))}
          value={leaveTypeId}
          onChange={(value) => setFilter('type', value)}
          clearable
          w={220}
        />
      </Group>

      {requests.isError && <QueryError error={requests.error} onRetry={() => void requests.refetch()} />}
      {requests.isPending && <Skeleton h={240} />}
      {requests.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<IconListDetails size={22} />}
              title={filtered ? 'No requests match' : 'No requests yet'}
              description={filtered ? 'Try another status or leave type.' : 'Requests you make appear here.'}
            />
          ) : (
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Dates</Table.Th>
                    <Table.Th>Leave type</Table.Th>
                    <Table.Th ta="right">Days</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Requested</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((request) => {
                    const sessions = describeSessions(
                      request.startDate,
                      request.endDate,
                      request.startSession,
                      request.endSession,
                    );
                    return (
                      <Table.Tr
                        key={request.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/leave/${request.id}`)}
                      >
                        <Table.Td>
                          <Anchor
                            component={Link}
                            to={`/leave/${request.id}`}
                            size="sm"
                            fw={500}
                            c="inherit"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {formatDateRange(request.startDate, request.endDate)}
                          </Anchor>
                          {sessions && (
                            <Text size="xs" c="dimmed">
                              {sessions}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <LeaveTypeLabel name={request.leaveType?.name} color={request.leaveType?.color} />
                        </Table.Td>
                        <Table.Td ta="right">{formatDays(request.totalDays)}</Table.Td>
                        <Table.Td>
                          <LeaveStatusBadge status={request.status} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatInstantDate(request.createdAt)}</Text>
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
      {(requests.data?.totalPages ?? 0) > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            value={page}
            onChange={(next) => setFilter('page', String(next))}
            total={requests.data?.totalPages ?? 1}
          />
        </Group>
      )}
    </>
  );
}
