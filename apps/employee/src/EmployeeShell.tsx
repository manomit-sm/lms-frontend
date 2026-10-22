import { ADMIN_PERMISSIONS, Permission } from '@lms/api';
import { useCurrentUser, useSession } from '@lms/auth';
import { PortalShell, type NavItem } from '@lms/ui';
import { Badge, Menu } from '@mantine/core';
import {
  IconBell,
  IconCalendarMonth,
  IconCalendarPlus,
  IconChecklist,
  IconExternalLink,
  IconLayoutDashboard,
  IconListDetails,
  IconScale,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { NotificationBell } from './notifications/NotificationBell';
import { useNotificationStream } from './notifications/useNotificationStream';
import { api, config } from './runtime';

function useWaitingApprovals(enabled: boolean): number {
  const tasks = api.query.useQuery('get', '/api/v1/approvals/tasks', {}, { enabled });
  return tasks.data?.length ?? 0;
}

export function EmployeeShell() {
  const user = useCurrentUser();
  const { signOut } = useSession();
  const isEmployee = Boolean(user.me.employee);
  const canApprove = user.can(Permission.LEAVE_APPROVE);
  const waiting = useWaitingApprovals(canApprove);
  useNotificationStream();

  const navItems: NavItem[] = [
    { label: 'Dashboard', to: '/', icon: <IconLayoutDashboard size={18} /> },
    ...(isEmployee && user.can(Permission.LEAVE_APPLY)
      ? [{ label: 'Apply for leave', to: '/leave/apply', icon: <IconCalendarPlus size={18} /> }]
      : []),
    ...(isEmployee
      ? [
          { label: 'My leave', to: '/leave', icon: <IconListDetails size={18} /> },
          { label: 'Balances', to: '/balances', icon: <IconScale size={18} /> },
          { label: 'Calendar', to: '/calendar', icon: <IconCalendarMonth size={18} /> },
        ]
      : []),
    ...(canApprove
      ? [
          {
            label: 'Approvals',
            to: '/approvals',
            icon: <IconChecklist size={18} />,
            badge: waiting > 0 && (
              <Badge size="sm" circle={waiting < 10} aria-label={`${waiting} waiting`}>
                {waiting}
              </Badge>
            ),
          },
        ]
      : []),
    ...(isEmployee && user.can(Permission.EMPLOYEE_VIEW_TEAM)
      ? [{ label: 'Team', to: '/team', icon: <IconUsers size={18} /> }]
      : []),
  ];

  return (
    <PortalShell
      portalName="Employee"
      navItems={navItems}
      user={{ name: user.name, detail: `${user.me.email ?? ''} · ${user.me.tenant?.key ?? ''}` }}
      headerActions={<NotificationBell />}
      menuItems={
        <>
          <Menu.Item component={Link} to="/profile" leftSection={<IconUser size={16} />}>
            Profile
          </Menu.Item>
          <Menu.Item component={Link} to="/notifications" leftSection={<IconBell size={16} />}>
            Notifications
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
