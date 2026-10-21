import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { activeNavItem } from './activeNavItem';
import { initials } from './initials';

export interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

export interface ShellUser {
  name: string;
  /** Second line in the user menu, e.g. email or tenant. */
  detail: string;
}

export interface PortalShellProps {
  portalName: string;
  /** Already filtered to what the user may open. */
  navItems: NavItem[];
  user: ShellUser;
  /** Extra user-menu entries above "Sign out" (e.g. a link to another portal). */
  menuItems?: ReactNode;
  onSignOut: () => void;
}

/** The layout every portal shares: header with the user menu, navigation, and the page in `<Outlet />`. */
export function PortalShell({ portalName, navItems, user, menuItems, onSignOut }: PortalShellProps) {
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  const { setColorScheme } = useMantineColorScheme();
  const colorScheme = useComputedColorScheme('light');
  const location = useLocation();
  const activeTo = activeNavItem(navItems, location.pathname);

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !navOpened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={navOpened} onClick={toggleNav} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <Text fw={700} size="lg">
              LMS
            </Text>
            <Text c="dimmed" size="sm" visibleFrom="xs">
              {portalName}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label={colorScheme === 'dark' ? 'Use light colours' : 'Use dark colours'}
              onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <Menu position="bottom-end" width={240} withinPortal>
              <Menu.Target>
                <UnstyledButton aria-label="Account menu">
                  <Group gap={8} wrap="nowrap">
                    <Avatar size={32} radius="xl" color="teal">
                      {initials(user.name)}
                    </Avatar>
                    <Text size="sm" fw={500} visibleFrom="sm" maw={180} truncate>
                      {user.name}
                    </Text>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="sm" fw={500} c="var(--mantine-color-text)" truncate>
                    {user.name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {user.detail}
                  </Text>
                </Menu.Label>
                {menuItems}
                <Menu.Divider />
                <Menu.Item leftSection={<IconLogout size={16} />} onClick={onSignOut}>
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          <nav aria-label="Main">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={item.label}
                leftSection={item.icon}
                active={item.to === activeTo}
                aria-current={item.to === activeTo ? 'page' : undefined}
                onClick={closeNav}
              />
            ))}
          </nav>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
