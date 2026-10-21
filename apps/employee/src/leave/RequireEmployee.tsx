import { useCurrentUser } from '@lms/auth';
import { MessagePage } from '@lms/ui';
import { Button } from '@mantine/core';
import { IconUserQuestion } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router';

/** Leave pages need the user's employee record: without one there is no balance or leave to show. */
export function RequireEmployee({ children }: { children: ReactNode }) {
  const { me } = useCurrentUser();
  if (!me.employee) {
    return (
      <MessagePage
        icon={<IconUserQuestion size={28} />}
        title="No employee record"
        description="Your account isn’t linked to an employee, so there is no leave to show. HR can link one by adding an employee with your email address."
        actions={
          <Button component={Link} to="/">
            Go to the dashboard
          </Button>
        }
      />
    );
  }
  return children;
}

/** Route element form of {@link RequireEmployee} for a group of leave routes. */
export function RequireEmployeeOutlet() {
  return (
    <RequireEmployee>
      <Outlet />
    </RequireEmployee>
  );
}
