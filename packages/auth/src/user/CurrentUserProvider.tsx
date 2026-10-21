import { errorMessage, isApiError, type TenantApi } from '@lms/api';
import { CenteredLoader, MessagePage } from '@lms/ui';
import { Button } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useMemo, type ReactNode } from 'react';
import { useSession } from '../session/useSession';
import { CurrentUserContext, toCurrentUser } from './currentUser';

/** Errors that mean "you can't use this tenant", as opposed to a failure worth retrying. */
const ACCOUNT_ERRORS = new Set(['USER_NOT_REGISTERED', 'TENANT_NOT_FOUND', 'TENANT_SUSPENDED']);

/**
 * Loads `/auth/me` once per session and provides it to the portal; nothing below renders until it is
 * known. A user who can't use the tenant (not registered, disabled, tenant suspended) is told why.
 */
export function CurrentUserProvider({ api, children }: { api: TenantApi; children: ReactNode }) {
  const { signOut } = useSession();
  const { data, error, refetch } = api.query.useQuery('get', '/api/v1/auth/me');
  const user = useMemo(() => (data ? toCurrentUser(data) : null), [data]);

  if (error) {
    const accountProblem = isApiError(error) && (error.status === 403 || ACCOUNT_ERRORS.has(error.errorCode));
    return (
      <MessagePage
        fullScreen
        icon={<IconLock size={28} />}
        title={accountProblem ? 'You can’t sign in here' : 'Could not load your account'}
        description={errorMessage(error)}
        actions={
          <>
            {!accountProblem && <Button onClick={() => void refetch()}>Try again</Button>}
            <Button variant={accountProblem ? 'filled' : 'subtle'} onClick={signOut}>
              Sign out
            </Button>
          </>
        }
      />
    );
  }
  if (!user) {
    return <CenteredLoader fullScreen />;
  }
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}
