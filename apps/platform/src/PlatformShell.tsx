import { useSession } from '@lms/auth';
import { PortalShell, type NavItem } from '@lms/ui';
import { IconBuildingSkyscraper } from '@tabler/icons-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Tenants', to: '/tenants', icon: <IconBuildingSkyscraper size={18} /> },
];

/** Platform admins have no profile endpoint: the shell shows who signed in from the session. */
export function PlatformShell() {
  const { session, signOut } = useSession();
  return (
    <PortalShell
      portalName="Platform"
      navItems={NAV_ITEMS}
      user={{ name: session?.label ?? 'Platform admin', detail: 'Platform admin' }}
      onSignOut={signOut}
    />
  );
}
