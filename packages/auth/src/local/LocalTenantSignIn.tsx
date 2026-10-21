import { errorMessage, type LocalAuthApi, type LocalUser } from '@lms/api';
import { Alert, Badge, Button, Group, Select, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { returnPath } from '../session/paths';
import { useSession } from '../session/useSession';
import { SignInLayout } from './SignInLayout';

const TOKEN_TTL_MINUTES = 480;

/**
 * Local-profile sign-in for the tenant portals: pick a tenant and one of its users, and the backend's
 * local issuer signs a token with the same claims Cognito will. Replaced by Cognito sign-in when deployed.
 */
export function LocalTenantSignIn({ localApi, portalName }: { localApi: LocalAuthApi; portalName: string }) {
  const { session, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [savedTenantId, setSavedTenantId] = useLocalStorage<string | null>({
    key: 'lms.local.tenant',
    defaultValue: null,
  });
  const [search, setSearch] = useState('');

  const tenants = useQuery({ queryKey: ['local', 'tenants'], queryFn: localApi.tenants });
  const tenantId =
    tenants.data?.find((tenant) => tenant.id === savedTenantId)?.id ??
    (tenants.data?.length === 1 ? tenants.data[0]?.id : undefined);
  const users = useQuery({
    queryKey: ['local', 'users', tenantId],
    queryFn: () => localApi.users(tenantId!),
    enabled: tenantId !== undefined,
  });

  const signInAs = useMutation({
    mutationFn: (user: LocalUser) => localApi.tenantToken(user.subject, tenantId!, TOKEN_TTL_MINUTES),
    onSuccess: (token, user) => {
      signIn({
        accessToken: token.accessToken,
        expiresAt: Date.now() + token.expiresIn * 1000,
        label: user.email,
      });
      navigate(returnPath(location.search), { replace: true });
    },
    meta: { handlesError: true },
  });

  if (session) {
    return <Navigate to={returnPath(location.search)} replace />;
  }

  const query = search.trim().toLowerCase();
  const shownUsers = (users.data ?? []).filter(
    (user) =>
      !query || user.email.includes(query) || user.roles.some((role) => role.toLowerCase().includes(query)),
  );

  return (
    <SignInLayout portalName={portalName}>
      {tenants.isError && <Alert color="red">{errorMessage(tenants.error)}</Alert>}
      {tenants.data?.length === 0 && (
        <Alert color="yellow" title="No tenants yet">
          Create one in the platform portal, or with <code>POST /platform/tenants</code>.
        </Alert>
      )}
      <Select
        label="Tenant"
        placeholder={tenants.isPending ? 'Loading…' : 'Choose a tenant'}
        data={(tenants.data ?? []).map((tenant) => ({ value: tenant.id, label: tenant.key }))}
        value={tenantId ?? null}
        onChange={(value) => setSavedTenantId(value)}
        disabled={!tenants.data?.length}
        searchable
      />
      {tenantId && (
        <Stack gap="xs">
          <TextInput
            aria-label="Search users"
            placeholder="Search by email or role"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          {users.isPending && <Skeleton h={160} />}
          {users.isError && <Alert color="red">{errorMessage(users.error)}</Alert>}
          {signInAs.isError && <Alert color="red">{errorMessage(signInAs.error)}</Alert>}
          {users.data && shownUsers.length === 0 && (
            <Text c="dimmed" size="sm">
              No users match.
            </Text>
          )}
          <Stack gap={6} mah={360} style={{ overflowY: 'auto' }}>
            {shownUsers.map((user) => (
              <Group key={user.id} justify="space-between" wrap="nowrap" gap="sm" py={4}>
                <Stack gap={2} miw={0}>
                  <Text size="sm" fw={500} truncate>
                    {user.email}
                  </Text>
                  <Group gap={4}>
                    {user.roles.map((role) => (
                      <Badge key={role} size="xs" variant="light" color="gray">
                        {role}
                      </Badge>
                    ))}
                    {user.status === 'INVITED' && (
                      <Badge size="xs" variant="light" color="blue">
                        First sign-in
                      </Badge>
                    )}
                  </Group>
                </Stack>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => signInAs.mutate(user)}
                  loading={signInAs.isPending && signInAs.variables?.id === user.id}
                  disabled={signInAs.isPending}
                >
                  Sign in
                </Button>
              </Group>
            ))}
          </Stack>
        </Stack>
      )}
    </SignInLayout>
  );
}
