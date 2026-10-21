import type { PlatformSchemas } from '@lms/api';
import { PageHeader, QueryError } from '@lms/ui';
import { Badge, Card, Group, Pagination, Skeleton, Table, Text, Tooltip } from '@mantine/core';
import { useState } from 'react';
import { api } from '../runtime';

type Tenant = PlatformSchemas['schemas']['TenantResponse'];

const PAGE_SIZE = 20;

const STATUS_COLOR: Record<NonNullable<Tenant['status']>, string> = {
  PROVISIONING: 'blue',
  ACTIVE: 'teal',
  SUSPENDED: 'orange',
  DEACTIVATED: 'gray',
};

const MIGRATION_COLOR: Record<NonNullable<Tenant['migrationState']>, string> = {
  PENDING: 'blue',
  UP_TO_DATE: 'teal',
  FAILED: 'red',
};

function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}

export function TenantsPage() {
  const [page, setPage] = useState(1);
  const tenants = api.query.useQuery('get', '/platform/tenants', {
    params: { query: { page: page - 1, size: PAGE_SIZE } },
  });

  return (
    <>
      <PageHeader title="Tenants" description="Every organisation on the platform, newest first." />
      {tenants.isError && <QueryError error={tenants.error} onRetry={() => void tenants.refetch()} />}
      {tenants.isPending && <Skeleton h={240} />}
      {tenants.data && (
        <Card withBorder padding={0}>
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Tenant</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Schema</Table.Th>
                  <Table.Th>Timezone</Table.Th>
                  <Table.Th>Created</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(tenants.data.content ?? []).map((tenant) => (
                  <Table.Tr key={tenant.id}>
                    <Table.Td>
                      <Text fw={500}>{tenant.name}</Text>
                      <Text size="xs" c="dimmed">
                        {tenant.key}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {tenant.status && (
                        <Badge variant="light" color={STATUS_COLOR[tenant.status]}>
                          {label(tenant.status)}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <Text size="sm" ff="monospace">
                          {tenant.schemaName}
                        </Text>
                        {tenant.migrationState && (
                          <Tooltip
                            label={tenant.migrationError}
                            disabled={!tenant.migrationError}
                            multiline
                            w={320}
                          >
                            <Badge size="sm" variant="dot" color={MIGRATION_COLOR[tenant.migrationState]}>
                              {label(tenant.migrationState)}
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{tenant.defaultTimezone}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {tenant.createdAt &&
                          new Date(tenant.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {tenants.data.content?.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="lg">
                        No tenants yet.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
      {(tenants.data?.totalPages ?? 0) > 1 && (
        <Group justify="center" mt="md">
          <Pagination value={page} onChange={setPage} total={tenants.data?.totalPages ?? 1} />
        </Group>
      )}
    </>
  );
}
