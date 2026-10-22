import { ADMIN_PERMISSIONS, type Permission } from '@lms/api';
import { useCurrentUser, useSession } from '@lms/auth';
import { MessagePage, PortalShell, type NavItem } from '@lms/ui';
import { Button, Menu } from '@mantine/core';
import {
  IconAdjustments,
  IconBuilding,
  IconChartBar,
  IconHistory,
  IconCalendarCog,
  IconConfetti,
  IconRoute,
  IconScale,
  IconExternalLink,
  IconLayoutDashboard,
  IconLock,
  IconShieldLock,
  IconUserCog,
  IconUsers,
} from '@tabler/icons-react';
import { AREA_PERMISSIONS } from './navigation';
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

  const areas: (NavItem & { anyOf: readonly Permission[] })[] = [
    {
      label: 'Employees',
      to: '/employees',
      icon: <IconUsers size={18} />,
      anyOf: AREA_PERMISSIONS.employees,
    },
    {
      label: 'Organisation',
      to: '/organisation',
      icon: <IconBuilding size={18} />,
      anyOf: AREA_PERMISSIONS.organisation,
    },
    { label: 'Users', to: '/users', icon: <IconUserCog size={18} />, anyOf: AREA_PERMISSIONS.users },
    { label: 'Roles', to: '/roles', icon: <IconShieldLock size={18} />, anyOf: AREA_PERMISSIONS.roles },
    {
      label: 'Leave setup',
      to: '/leave-setup',
      icon: <IconCalendarCog size={18} />,
      anyOf: AREA_PERMISSIONS.leaveSetup,
    },
    {
      label: 'Holidays',
      to: '/holidays',
      icon: <IconConfetti size={18} />,
      anyOf: AREA_PERMISSIONS.holidays,
    },
    {
      label: 'Approval workflows',
      to: '/workflows',
      icon: <IconRoute size={18} />,
      anyOf: AREA_PERMISSIONS.workflows,
    },
    { label: 'Balances', to: '/balances', icon: <IconScale size={18} />, anyOf: AREA_PERMISSIONS.balances },
    { label: 'Reports', to: '/reports', icon: <IconChartBar size={18} />, anyOf: AREA_PERMISSIONS.reports },
    { label: 'Audit log', to: '/audit', icon: <IconHistory size={18} />, anyOf: AREA_PERMISSIONS.audit },
    {
      label: 'Settings',
      to: '/settings',
      icon: <IconAdjustments size={18} />,
      anyOf: AREA_PERMISSIONS.settings,
    },
  ];
  const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/', icon: <IconLayoutDashboard size={18} /> },
    ...areas.filter((area) => user.canAny(area.anyOf)).map(({ anyOf: _, ...item }) => item),
  ];

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
