import type { NavItem } from './PortalShell';

/**
 * The item to highlight: the longest one the path is in, so "/leave/apply" lights up "Apply for leave"
 * rather than "My leave" too, and "/leave/123" lights up "My leave".
 */
export function activeNavItem(items: NavItem[], pathname: string): string | undefined {
  return items
    .filter((item) => pathname === item.to || (item.to !== '/' && pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
}
