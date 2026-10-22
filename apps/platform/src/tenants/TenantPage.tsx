import { applyFieldErrors, formatDateTime, FormError, PageHeader, QueryError, showSuccess } from '@lms/ui';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconMail,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../runtime';
import { label, MIGRATION_COLOR, STATUS_COLOR, type Tenant } from './tenantLabels';

function Field({ label: name, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {name}
      </Text>
      <Text size="sm" component="div">
        {children || '—'}
      </Text>
    </Stack>
  );
}

function AddAdmin({ tenant }: { tenant: Tenant }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const add = api.query.useMutation('post', '/platform/tenants/{tenantId}/admins', {
    meta: { handlesError: true },
  });
  const serving = tenant.migrationState === 'UP_TO_DATE' && tenant.status !== 'DEACTIVATED';

  return (
    <Card withBorder padding="lg">
      <Title order={4}>Tenant admins</Title>
      <Text size="sm" c="dimmed" mb="md">
        Makes someone a tenant admin, inviting them if they have no sign-in yet. Use it when the first admin’s
        invitation failed, or the tenant has lost its admins.
      </Text>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          setFormError(null);
          if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setErrors({ email: 'Enter an email address' });
            return;
          }
          add.mutate(
            { params: { path: { tenantId: tenant.id! } }, body: { email: email.trim() } },
            {
              onSuccess: () => {
                showSuccess(`${email.trim()} is a tenant admin of ${tenant.name}.`);
                setEmail('');
              },
              onError: (error) => setFormError(applyFieldErrors(error, setErrors)),
            },
          );
        }}
      >
        <Stack>
          <FormError message={formError} />
          <Group align="flex-start">
            <TextInput
              aria-label="Admin email"
              placeholder="admin@example.com"
              type="email"
              value={email}
              error={errors.email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              disabled={!serving}
              style={{ flex: 1 }}
            />
            <Button
              type="submit"
              leftSection={<IconMail size={16} />}
              loading={add.isPending}
              disabled={!serving}
            >
              Add admin
            </Button>
          </Group>
          {!serving && (
            <Text size="sm" c="dimmed">
              Only a tenant whose schema is up to date can get admins.
            </Text>
          )}
        </Stack>
      </form>
    </Card>
  );
}

/** One tenant: its state, and what platform staff can do about it. */
export function TenantPage() {
  const { tenantId = '' } = useParams();
  const queryClient = useQueryClient();
  const tenant = api.query.useQuery('get', '/platform/tenants/{tenantId}', {
    params: { path: { tenantId } },
  });
  const suspend = api.query.useMutation('post', '/platform/tenants/{tenantId}/suspend');
  const activate = api.query.useMutation('post', '/platform/tenants/{tenantId}/activate');
  const migrate = api.query.useMutation('post', '/platform/tenants/{tenantId}/migrate');

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['get', '/platform/tenants'] }),
      queryClient.invalidateQueries({ queryKey: ['get', '/platform/tenants/{tenantId}'] }),
    ]);
  const path = { params: { path: { tenantId } } };

  const back = (
    <Anchor
      component={Link}
      to="/tenants"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> Tenants
    </Anchor>
  );
  if (tenant.isError) {
    return (
      <>
        {back}
        <QueryError error={tenant.error} onRetry={() => void tenant.refetch()} />
      </>
    );
  }
  if (tenant.isPending) {
    return <Skeleton h={320} />;
  }
  const data = tenant.data;

  function confirmSuspend() {
    modals.openConfirmModal({
      title: <Text fw={600}>Suspend {data.name}?</Text>,
      children: (
        <Text size="sm">
          Nobody in the organisation can use LMS until it is activated again. Nothing is deleted.
        </Text>
      ),
      labels: { confirm: 'Suspend', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        suspend.mutate(path, {
          onSuccess: async () => {
            await refresh();
            showSuccess(`${data.name} is suspended.`);
          },
        }),
    });
  }

  return (
    <>
      {back}
      <PageHeader
        title={data.name ?? ''}
        description={
          <Group gap="sm" component="span">
            <Code>{data.key}</Code>
            {data.status && (
              <Badge variant="light" color={STATUS_COLOR[data.status]}>
                {label(data.status)}
              </Badge>
            )}
          </Group>
        }
        actions={
          <>
            {data.status === 'ACTIVE' && (
              <Button
                variant="default"
                color="red"
                leftSection={<IconPlayerPause size={16} />}
                onClick={confirmSuspend}
                loading={suspend.isPending}
              >
                Suspend
              </Button>
            )}
            {data.status === 'SUSPENDED' && (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                loading={activate.isPending}
                onClick={() =>
                  activate.mutate(path, {
                    onSuccess: async () => {
                      await refresh();
                      showSuccess(`${data.name} is active again.`);
                    },
                  })
                }
              >
                Activate
              </Button>
            )}
          </>
        }
      />
      <Stack gap="lg">
        {data.migrationState === 'FAILED' && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title="The schema migration failed">
            <Stack gap="sm">
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {data.migrationError ?? 'No error was recorded.'}
              </Text>
              <Group>
                <Button
                  size="xs"
                  color="red"
                  variant="white"
                  leftSection={<IconRefresh size={14} />}
                  loading={migrate.isPending}
                  onClick={() =>
                    migrate.mutate(path, {
                      onSuccess: async (result) => {
                        await refresh();
                        showSuccess(
                          result.migrationState === 'UP_TO_DATE'
                            ? 'The schema is up to date.'
                            : 'The migration ran again.',
                        );
                      },
                    })
                  }
                >
                  Retry the migration
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}
        <Card withBorder padding="lg">
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
            <Field label="Schema">
              <Group gap={6}>
                <Text size="sm" ff="monospace">
                  {data.schemaName}
                </Text>
                {data.migrationState && (
                  <Badge size="sm" variant="dot" color={MIGRATION_COLOR[data.migrationState]}>
                    {label(data.migrationState)}
                  </Badge>
                )}
              </Group>
            </Field>
            <Field label="Migrated">{formatDateTime(data.migratedAt)}</Field>
            <Field label="Timezone">{data.defaultTimezone}</Field>
            <Field label="Subdomain">{data.subdomain}</Field>
            <Field label="Created">{formatDateTime(data.createdAt)}</Field>
            <Field label="Last changed">{formatDateTime(data.updatedAt)}</Field>
          </SimpleGrid>
        </Card>
        {data.migrationState === 'UP_TO_DATE' && (
          <Group>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              loading={migrate.isPending}
              onClick={() =>
                migrate.mutate(path, {
                  onSuccess: async () => {
                    await refresh();
                    showSuccess('The schema is up to date.');
                  },
                })
              }
            >
              Run migrations again
            </Button>
          </Group>
        )}
        <AddAdmin tenant={data} />
      </Stack>
    </>
  );
}
