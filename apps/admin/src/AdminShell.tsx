import { ADMIN_PERMISSIONS } from '@lms/api';
import { useCurrentUser, useSession } from '@lms/auth';
import { MessagePage, PortalShell, type NavItem } from '@lms/ui';
import { Button, Menu } from '@mantine/core';
import { IconExternalLink, IconHome, IconLock } from '@tabler/icons-react';
import { config } from './runtime';

/** The admin portal's layout; users without any admin permission are sent to the employee portal. */
export function AdminShell() {
  const user = useCurrentUser();
  const { signOut } = useSession();

  if (!user.canAny(ADMIN_PERMISSIONS)) {
    return (
      <MessagePage
        fullScreen
        icon={<IconLock size={28} />}
        title="This portal is for administrators"
        description="Your account has no administration rights. Leave, approvals and your calendar are in the employee portal."
        actions={
          <>
            <Button component="a" href={config.employeePortalUrl}>
              Go to the employee portal
            </Button>
            <Button variant="subtle" onClick={signOut}>
              Sign out
            </Button>
          </>
        }
      />
    );
  }

  const navItems: NavItem[] = [{ label: 'Home', to: '/', icon: <IconHome size={18} /> }];

  return (
    <PortalShell
      portalName="Admin"
      navItems={navItems}
      user={{ name: user.name, detail: `${user.me.email ?? ''} · ${user.me.tenant?.key ?? ''}` }}
      menuItems={
        <Menu.Item
          component="a"
          href={config.employeePortalUrl}
          target="_blank"
          rel="noopener"
          leftSection={<IconExternalLink size={16} />}
        >
          Employee portal
        </Menu.Item>
      }
      onSignOut={signOut}
    />
  );
}
