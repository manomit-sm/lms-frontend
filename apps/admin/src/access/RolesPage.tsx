import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { EmptyState, PageHeader, QueryError } from '@lms/ui';
import { Anchor, Badge, Button, Card, Group, Skeleton, Table, Text } from '@mantine/core';
import { IconPlus, IconShieldLock } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router';
import { api } from '../runtime';

/** System roles (fixed) and the tenant's custom roles. */
export function RolesPage() {
  const { can } = useCurrentUser();
  const navigate = useNavigate();
  const roles = api.query.useQuery('get', '/api/v1/roles');
  const rows = [...(roles.data ?? [])].sort(
    (a, b) => Number(b.systemRole) - Number(a.systemRole) || (a.name ?? '').localeCompare(b.name ?? ''),
  );

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a set of permissions. System roles are fixed; custom roles combine any permissions."
        actions={
          can(Permission.ROLE_MANAGE) && (
            <Button component={Link} to="/roles/new" leftSection={<IconPlus size={16} />}>
              New role
            </Button>
          )
        }
      />
      {roles.isError && <QueryError error={roles.error} onRetry={() => void roles.refetch()} />}
      {roles.isPending && <Skeleton h={240} />}
      {roles.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconShieldLock size={22} />} title="No roles" />
          ) : (
            <Table.ScrollContainer minWidth={560}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Code</Table.Th>
                    <Table.Th ta="right">Permissions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((role) => (
                    <Table.Tr
                      key={role.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/roles/${role.id}`)}
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <Anchor
                            component={Link}
                            to={`/roles/${role.id}`}
                            size="sm"
                            fw={500}
                            c="inherit"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {role.name}
                          </Anchor>
                          {role.systemRole && (
                            <Badge size="sm" variant="light" color="gray">
                              System
                            </Badge>
                          )}
                        </Group>
                        {role.description && (
                          <Text size="xs" c="dimmed">
                            {role.description}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {role.code}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">{role.permissions?.length ?? 0}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
    </>
  );
}
