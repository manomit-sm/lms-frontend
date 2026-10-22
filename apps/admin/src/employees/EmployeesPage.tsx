import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  EMPLOYMENT_STATUS,
  EmploymentStatusBadge,
  EmptyState,
  initials,
  PageHeader,
  QueryError,
  type EmploymentStatus,
} from '@lms/ui';
import {
  Anchor,
  Avatar,
  Button,
  Card,
  Group,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconPlus, IconSearch, IconUsers } from '@tabler/icons-react';
import { keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../runtime';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = (Object.keys(EMPLOYMENT_STATUS) as EmploymentStatus[]).map((status) => ({
  value: status,
  label: EMPLOYMENT_STATUS[status].label,
}));

function isStatus(value: string | null): value is EmploymentStatus {
  return value !== null && value in EMPLOYMENT_STATUS;
}

/** Every employee, searchable and filterable; filters and page live in the URL. */
export function EmployeesPage() {
  const { can } = useCurrentUser();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const q = search.get('q') ?? '';
  const [text, setText] = useState(q);
  const status = search.get('status');
  const departmentId = search.get('department');
  const page = Math.max(1, Number(search.get('page')) || 1);

  const employees = api.query.useQuery(
    'get',
    '/api/v1/employees',
    {
      params: {
        query: {
          search: q || undefined,
          status: isStatus(status) ? status : undefined,
          departmentId: departmentId ?? undefined,
          page: page - 1,
          size: PAGE_SIZE,
        },
      },
    },
    { placeholderData: keepPreviousData },
  );
  const departments = api.query.useQuery('get', '/api/v1/departments');

  function setFilter(name: string, value: string | null) {
    setSearch(
      (current) => {
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
      },
      { replace: name === 'q' },
    );
  }
  const searchLater = useDebouncedCallback((value: string) => setFilter('q', value.trim() || null), 300);

  const rows = employees.data?.content ?? [];
  const filtered = Boolean(q || status || departmentId);

  return (
    <>
      <PageHeader
        title="Employees"
        description={
          employees.data
            ? `${employees.data.totalElements ?? 0} ${filtered ? 'matching' : 'in total'}`
            : undefined
        }
        actions={
          can(Permission.EMPLOYEE_MANAGE) && (
            <Button component={Link} to="/employees/new" leftSection={<IconPlus size={16} />}>
              Add employee
            </Button>
          )
        }
      />
      <Group mb="md" gap="sm">
        <TextInput
          aria-label="Search"
          placeholder="Name, email or code"
          leftSection={<IconSearch size={16} />}
          value={text}
          onChange={(event) => {
            setText(event.currentTarget.value);
            searchLater(event.currentTarget.value);
          }}
          w={260}
        />
        <Select
          aria-label="Department"
          placeholder="Any department"
          data={(departments.data ?? []).map((department) => ({
            value: department.id!,
            label: department.name ?? '',
          }))}
          value={departmentId}
          onChange={(value) => setFilter('department', value)}
          clearable
          searchable
          w={220}
        />
        <Select
          aria-label="Status"
          placeholder="Any status"
          data={STATUS_OPTIONS}
          value={isStatus(status) ? status : null}
          onChange={(value) => setFilter('status', value)}
          clearable
          w={180}
        />
      </Group>

      {employees.isError && <QueryError error={employees.error} onRetry={() => void employees.refetch()} />}
      {employees.isPending && <Skeleton h={320} />}
      {employees.data && (
        <Card withBorder padding={0} style={{ opacity: employees.isPlaceholderData ? 0.6 : 1 }}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<IconUsers size={22} />}
              title={filtered ? 'No employees match' : 'No employees yet'}
              description={filtered ? 'Try another search or filter.' : undefined}
            />
          ) : (
            <Table.ScrollContainer minWidth={760}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Department</Table.Th>
                    <Table.Th>Designation</Table.Th>
                    <Table.Th>Reports to</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((employee) => (
                    <Table.Tr
                      key={employee.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/employees/${employee.id}`)}
                    >
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar radius="xl" size={32} color="teal">
                            {initials(employee.fullName ?? '')}
                          </Avatar>
                          <Stack gap={0} miw={0}>
                            <Anchor
                              component={Link}
                              to={`/employees/${employee.id}`}
                              size="sm"
                              fw={500}
                              c="inherit"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {employee.fullName}
                            </Anchor>
                            <Text size="xs" c="dimmed" truncate>
                              {employee.employeeCode} · {employee.email}
                            </Text>
                          </Stack>
                        </Group>
                      </Table.Td>
                      <Table.Td>{employee.department?.name}</Table.Td>
                      <Table.Td>{employee.designation?.name}</Table.Td>
                      <Table.Td>{employee.reportingManager?.name}</Table.Td>
                      <Table.Td>
                        <EmploymentStatusBadge status={employee.employmentStatus} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {(employees.data?.totalPages ?? 0) > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            value={page}
            onChange={(next) => setFilter('page', String(next))}
            total={employees.data?.totalPages ?? 1}
          />
        </Group>
      )}
    </>
  );
}
