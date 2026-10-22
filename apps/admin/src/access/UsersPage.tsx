import { useCurrentUser } from '@lms/auth';
import {
  applyFieldErrors,
  EmptyState,
  formatDateTime,
  FormError,
  PageHeader,
  QueriesError,
  showSuccess,
} from '@lms/ui';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Modal,
  MultiSelect,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedCallback } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { IconMail, IconSearch, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Role, User } from '../types';

const PAGE_SIZE = 20;

type UserStatus = NonNullable<User['status']>;

const USER_STATUS: Record<UserStatus, { label: string; color: string }> = {
  INVITED: { label: 'Invited', color: 'blue' },
  ACTIVE: { label: 'Active', color: 'teal' },
  DISABLED: { label: 'Disabled', color: 'gray' },
};

function isStatus(value: string | null): value is UserStatus {
  return value !== null && value in USER_STATUS;
}

function StatusBadge({ status }: { status: User['status'] }) {
  return status ? (
    <Badge variant="light" size="sm" color={USER_STATUS[status].color}>
      {USER_STATUS[status].label}
    </Badge>
  ) : null;
}

function roleOptions(roles: readonly Role[]) {
  return roles.map((role) => ({ value: role.code!, label: role.name ?? role.code! }));
}

function InviteModal({ roles, onClose }: { roles: readonly Role[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    initialValues: { email: '', roleCodes: ['EMPLOYEE'] as string[] },
    validate: {
      email: (value: string) => (/^\S+@\S+\.\S+$/.test(value.trim()) ? null : 'Enter an email address'),
      roleCodes: (value: string[]) => (value.length > 0 ? null : 'Give at least one role'),
    },
  });
  const invite = api.query.useMutation('post', '/api/v1/users', { meta: { handlesError: true } });

  return (
    <Modal opened onClose={onClose} title={<Text fw={600}>Invite a user</Text>}>
      <form
        onSubmit={form.onSubmit((values) => {
          setFormError(null);
          invite.mutate(
            { body: { email: values.email.trim(), roleCodes: values.roleCodes } },
            {
              onSuccess: async (user) => {
                await invalidate(queryClient, '/api/v1/users');
                showSuccess(`Invitation sent to ${user.email}.`);
                onClose();
              },
              onError: (error) => setFormError(applyFieldErrors(error, form.setErrors)),
            },
          );
        })}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            For people who sign in without being employees, e.g. an outside HR administrator. Adding an
            employee already gives them a sign-in.
          </Text>
          <FormError message={formError} />
          <TextInput label="Email" type="email" required data-autofocus {...form.getInputProps('email')} />
          <MultiSelect
            label="Roles"
            required
            data={roleOptions(roles)}
            {...form.getInputProps('roleCodes')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" leftSection={<IconMail size={16} />} loading={invite.isPending}>
              Send invitation
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function UserDrawer({ user, roles, onClose }: { user: User; roles: readonly Role[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { me } = useCurrentUser();
  const [roleCodes, setRoleCodes] = useState<string[]>([...(user.roles ?? [])]);
  const [formError, setFormError] = useState<string | null>(null);
  const saveRoles = api.query.useMutation('put', '/api/v1/users/{userId}/roles', {
    meta: { handlesError: true },
  });
  const enable = api.query.useMutation('post', '/api/v1/users/{userId}/enable');
  const disable = api.query.useMutation('post', '/api/v1/users/{userId}/disable');
  const employee = api.query.useQuery(
    'get',
    '/api/v1/employees/{employeeId}',
    { params: { path: { employeeId: user.employeeId ?? '' } } },
    { enabled: Boolean(user.employeeId) },
  );
  const self = user.id === me.userId;
  const changed = [...roleCodes].sort().join() !== [...(user.roles ?? [])].sort().join();
  const done = (message: string) => async () => {
    await invalidate(queryClient, '/api/v1/users');
    showSuccess(message);
    onClose();
  };

  function confirmDisable() {
    modals.openConfirmModal({
      title: <Text fw={600}>Disable {user.email}?</Text>,
      children: (
        <Text size="sm">They can’t sign in until the user is enabled again. Nothing is deleted.</Text>
      ),
      labels: { confirm: 'Disable', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        disable.mutate({ params: { path: { userId: user.id! } } }, { onSuccess: done('User disabled.') }),
    });
  }

  return (
    <Drawer opened onClose={onClose} position="right" title={<Text fw={600}>{user.email}</Text>}>
      <Stack>
        <Group gap="xs">
          <StatusBadge status={user.status} />
          {self && (
            <Badge variant="outline" size="sm" color="gray">
              You
            </Badge>
          )}
        </Group>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            Employee
          </Text>
          {user.employeeId ? (
            <Anchor component={Link} to={`/employees/${user.employeeId}`} size="sm">
              {employee.data?.fullName ?? 'Open employee'}
            </Anchor>
          ) : (
            <Text size="sm" c="dimmed">
              Not linked to an employee
            </Text>
          )}
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {user.activatedAt ? 'First signed in' : 'Invited'}
          </Text>
          <Text size="sm">{formatDateTime(user.activatedAt ?? user.createdAt)}</Text>
        </Stack>
        <FormError message={formError} />
        <MultiSelect
          label="Roles"
          description="Their permissions are everything these roles allow."
          data={roleOptions(roles)}
          value={roleCodes}
          onChange={(value) => {
            setRoleCodes(value);
            setFormError(null);
          }}
        />
        <Group justify="space-between">
          {user.status === 'DISABLED' ? (
            <Button
              variant="default"
              loading={enable.isPending}
              onClick={() =>
                enable.mutate(
                  { params: { path: { userId: user.id! } } },
                  { onSuccess: done('User enabled.') },
                )
              }
            >
              Enable
            </Button>
          ) : (
            <Button
              variant="subtle"
              color="red"
              disabled={self}
              loading={disable.isPending}
              onClick={confirmDisable}
            >
              Disable
            </Button>
          )}
          <Button
            disabled={!changed || roleCodes.length === 0}
            loading={saveRoles.isPending}
            onClick={() =>
              saveRoles.mutate(
                { params: { path: { userId: user.id! } }, body: { roleCodes } },
                {
                  onSuccess: done('Roles saved.'),
                  onError: (error) => setFormError(applyFieldErrors(error, () => undefined)),
                },
              )
            }
          >
            Save roles
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}

/** Everyone who can sign in to the organisation, their roles, and invitations. */
export function UsersPage() {
  const [search, setSearch] = useSearchParams();
  const q = search.get('q') ?? '';
  const [text, setText] = useState(q);
  const status = search.get('status');
  const page = Math.max(1, Number(search.get('page')) || 1);
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const users = api.query.useQuery(
    'get',
    '/api/v1/users',
    {
      params: {
        query: {
          search: q || undefined,
          status: isStatus(status) ? status : undefined,
          page: page - 1,
          size: PAGE_SIZE,
        },
      },
    },
    { placeholderData: keepPreviousData },
  );
  const roles = api.query.useQuery('get', '/api/v1/roles');
  const roleName = new Map((roles.data ?? []).map((role) => [role.code, role.name]));

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
  const rows = users.data?.content ?? [];

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in, and what their roles let them do."
        actions={
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={() => setInviting(true)}
            disabled={!roles.data}
          >
            Invite user
          </Button>
        }
      />
      <Group mb="md" gap="sm">
        <TextInput
          aria-label="Search"
          placeholder="Email"
          leftSection={<IconSearch size={16} />}
          value={text}
          onChange={(event) => {
            setText(event.currentTarget.value);
            searchLater(event.currentTarget.value);
          }}
          w={260}
        />
        <Select
          aria-label="Status"
          placeholder="Any status"
          data={(Object.keys(USER_STATUS) as UserStatus[]).map((value) => ({
            value,
            label: USER_STATUS[value].label,
          }))}
          value={isStatus(status) ? status : null}
          onChange={(value) => setFilter('status', value)}
          clearable
          w={180}
        />
      </Group>
      <QueriesError queries={[users, roles]} />
      {users.isPending && <Skeleton h={320} />}
      {users.data && (
        <Card withBorder padding={0} style={{ opacity: users.isPlaceholderData ? 0.6 : 1 }}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconUsers size={22} />} title="No users match" />
          ) : (
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Roles</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>First signed in</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((user) => (
                    <Table.Tr key={user.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(user)}>
                      <Table.Td>
                        <Anchor
                          component="button"
                          type="button"
                          size="sm"
                          fw={500}
                          c="inherit"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(user);
                          }}
                        >
                          {user.email}
                        </Anchor>
                        {!user.employeeId && (
                          <Text size="xs" c="dimmed">
                            No employee record
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {[...(user.roles ?? [])].sort().map((code) => (
                            <Badge key={code} size="sm" variant="outline" color="gray">
                              {roleName.get(code) ?? code}
                            </Badge>
                          ))}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={user.status} />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={user.activatedAt ? undefined : 'dimmed'}>
                          {user.activatedAt ? formatDateTime(user.activatedAt) : 'Not yet'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
      {(users.data?.totalPages ?? 0) > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            value={page}
            onChange={(next) => setFilter('page', String(next))}
            total={users.data?.totalPages ?? 1}
          />
        </Group>
      )}
      {inviting && roles.data && <InviteModal roles={roles.data} onClose={() => setInviting(false)} />}
      {selected && roles.data && (
        <UserDrawer key={selected.id} user={selected} roles={roles.data} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
