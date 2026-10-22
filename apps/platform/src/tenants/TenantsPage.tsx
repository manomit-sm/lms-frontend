import { formatDateTime, PageHeader, QueryError } from '@lms/ui';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  Skeleton,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';
import { useState } from 'react';
import { api } from '../runtime';
import { CreateTenantModal } from './CreateTenantModal';
import { label, MIGRATION_COLOR, STATUS_COLOR } from './tenantLabels';

const PAGE_SIZE = 20;

/** Every organisation on the platform, newest first. */
export function TenantsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const tenants = api.query.useQuery('get', '/platform/tenants', {
    params: { query: { page: page - 1, size: PAGE_SIZE } },
  });

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Every organisation on the platform, newest first."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            Add tenant
          </Button>
        }
      />
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
                  <Table.Tr
                    key={tenant.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                  >
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/tenants/${tenant.id}`}
                        fw={500}
                        c="inherit"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {tenant.name}
                      </Anchor>
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
                      <Text size="sm">{formatDateTime(tenant.createdAt)}</Text>
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
      {creating && <CreateTenantModal onClose={() => setCreating(false)} />}
    </>
  );
}
