import { ADMIN_PERMISSIONS, Permission } from '@lms/api';
import { useCurrentUser, useSession } from '@lms/auth';
import { PortalShell, type NavItem } from '@lms/ui';
import { Menu } from '@mantine/core';
import {
  IconCalendarPlus,
  IconExternalLink,
  IconLayoutDashboard,
  IconListDetails,
  IconScale,
  IconUser,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { config } from './runtime';

export function EmployeeShell() {
  const user = useCurrentUser();
  const { signOut } = useSession();
  const isEmployee = Boolean(user.me.employee);

  const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/', icon: <IconLayoutDashboard size={18} /> },
    ...(isEmployee && user.can(Permission.LEAVE_APPLY)
      ? [{ label: 'Apply for leave', to: '/leave/apply', icon: <IconCalendarPlus size={18} /> }]
      : []),
    ...(isEmployee
      ? [
          { label: 'My leave', to: '/leave', icon: <IconListDetails size={18} /> },
          { label: 'Balances', to: '/balances', icon: <IconScale size={18} /> },
        ]
      : []),
  ];

  return (
    <PortalShell
      portalName="Employee"
      navItems={navItems}
      user={{ name: user.name, detail: `${user.me.email ?? ''} · ${user.me.tenant?.key ?? ''}` }}
      menuItems={
        <>
          <Menu.Item component={Link} to="/profile" leftSection={<IconUser size={16} />}>
            Profile
          </Menu.Item>
          {user.canAny(ADMIN_PERMISSIONS) && (
            <Menu.Item
              component="a"
              href={config.adminPortalUrl}
              target="_blank"
              rel="noopener"
              leftSection={<IconExternalLink size={16} />}
            >
              Admin portal
            </Menu.Item>
          )}
        </>
      }
      onSignOut={signOut}
    />
  );
}
