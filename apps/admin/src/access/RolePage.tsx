import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { applyFieldErrors, FormError, PageHeader, QueryError, showSuccess } from '@lms/ui';
import { Alert, Anchor, Button, Card, Group, Input, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconInfoCircle, IconTrash } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Role } from '../types';
import { PermissionPicker } from './PermissionPicker';

interface RoleForm {
  code: string;
  name: string;
  description: string;
  permissionCodes: string[];
}

const CODE = /^[A-Z][A-Z0-9_]{2,39}$/;

function RoleEditor({ role }: { role?: Role }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [formError, setFormError] = useState<string | null>(null);
  const permissions = api.query.useQuery('get', '/api/v1/permissions');
  const readOnly = Boolean(role?.systemRole) || !user.can(Permission.ROLE_MANAGE);
  const form = useForm<RoleForm>({
    initialValues: {
      code: role?.code ?? '',
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissionCodes: [...(role?.permissions ?? [])].sort(),
    },
    validate: {
      code: (value) =>
        role || CODE.test(value) ? null : 'Capitals, digits and _, starting with a letter (3–40)',
      name: (value) => (value.trim() ? null : 'Enter a name'),
      permissionCodes: (value) => (value.length > 0 ? null : 'Pick at least one permission'),
    },
  });
  const create = api.query.useMutation('post', '/api/v1/roles', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/roles/{roleId}', { meta: { handlesError: true } });
  const remove = api.query.useMutation('delete', '/api/v1/roles/{roleId}');

  function submit(values: RoleForm) {
    setFormError(null);
    const onError = (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors));
    const onSuccess = async (saved: Role) => {
      await invalidate(queryClient, '/api/v1/roles', '/api/v1/roles/{roleId}', '/api/v1/users');
      showSuccess(role ? 'Role saved.' : `Role ${saved.name} created.`);
      navigate('/roles');
    };
    const common = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      permissionCodes: values.permissionCodes,
    };
    if (role?.id) {
      update.mutate({ params: { path: { roleId: role.id } }, body: common }, { onSuccess, onError });
    } else {
      create.mutate({ body: { ...common, code: values.code } }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    modals.openConfirmModal({
      title: <Text fw={600}>Delete {role?.name}?</Text>,
      children: <Text size="sm">Only a role that no user holds can be deleted.</Text>,
      labels: { confirm: 'Delete role', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        remove.mutate(
          { params: { path: { roleId: role!.id! } } },
          {
            onSuccess: async () => {
              await invalidate(queryClient, '/api/v1/roles');
              showSuccess('Role deleted.');
              navigate('/roles');
            },
          },
        ),
    });
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="lg">
        {role?.systemRole && (
          <Alert icon={<IconInfoCircle size={18} />} color="blue">
            System roles come with every organisation and can’t be changed. To grant a different mix, create a
            custom role.
          </Alert>
        )}
        <FormError message={formError} />
        <Card withBorder padding="lg">
          <Stack>
            <Group grow align="flex-start">
              <TextInput
                label="Code"
                description={role ? 'Codes never change.' : 'Capitals, e.g. TEAM_LEAD'}
                required
                disabled={Boolean(role)}
                {...form.getInputProps('code')}
                onChange={(event) => form.setFieldValue('code', event.currentTarget.value.toUpperCase())}
              />
              <TextInput
                label="Name"
                required
                maxLength={100}
                readOnly={readOnly}
                {...form.getInputProps('name')}
              />
            </Group>
            <TextInput
              label="Description"
              maxLength={255}
              readOnly={readOnly}
              {...form.getInputProps('description')}
            />
          </Stack>
        </Card>
        <Card withBorder padding="lg">
          <Input.Wrapper
            label={<Text fw={600}>Permissions</Text>}
            description={`${form.values.permissionCodes.length} selected`}
            error={form.errors.permissionCodes}
            mb="md"
          />
          {permissions.isError && (
            <QueryError error={permissions.error} onRetry={() => void permissions.refetch()} />
          )}
          {permissions.isPending && <Skeleton h={240} />}
          {permissions.data && (
            <PermissionPicker
              permissions={permissions.data}
              value={form.values.permissionCodes}
              onChange={(value) => form.setFieldValue('permissionCodes', value)}
              readOnly={readOnly}
              held={new Set(user.me.permissions ?? [])}
            />
          )}
        </Card>
        {!readOnly && (
          <Group justify="space-between">
            {role ? (
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={confirmDelete}
                loading={remove.isPending}
              >
                Delete role
              </Button>
            ) : (
              <span />
            )}
            <Group>
              <Button variant="default" component={Link} to="/roles">
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending || update.isPending}>
                {role ? 'Save' : 'Create role'}
              </Button>
            </Group>
          </Group>
        )}
      </Stack>
    </form>
  );
}

function BackLink() {
  return (
    <Anchor
      component={Link}
      to="/roles"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> Roles
    </Anchor>
  );
}

export function NewRolePage() {
  return (
    <>
      <BackLink />
      <PageHeader title="New role" />
      <RoleEditor />
    </>
  );
}

export function RolePage() {
  const { roleId = '' } = useParams();
  const role = api.query.useQuery('get', '/api/v1/roles/{roleId}', { params: { path: { roleId } } });
  return (
    <>
      <BackLink />
      <PageHeader title={role.data?.name ?? 'Role'} />
      {role.isError && <QueryError error={role.error} onRetry={() => void role.refetch()} />}
      {role.isPending && <Skeleton h={400} />}
      {role.data && <RoleEditor key={role.data.updatedAt} role={role.data} />}
    </>
  );
}
