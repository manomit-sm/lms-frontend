import type { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import { MessagePage } from '@lms/ui';
import { Button } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { Link, Outlet } from 'react-router';

/** Routes for holders of any of these permissions; others get a page saying so, not a broken screen. */
export function RequirePermission({ anyOf }: { anyOf: readonly Permission[] }) {
  const { canAny } = useCurrentUser();
  if (!canAny(anyOf)) {
    return (
      <MessagePage
        icon={<IconLock size={28} />}
        title="You don’t have access to this"
        description="Your roles don’t include the permission this page needs. An administrator can change your roles."
        actions={
          <Button component={Link} to="/">
            Go home
          </Button>
        }
      />
    );
  }
  return <Outlet />;
}
