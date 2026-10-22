import { Badge } from '@mantine/core';

/** Active or inactive, for organisation records that are deactivated rather than deleted. */
export function ActiveBadge({ active }: { active: boolean | undefined }) {
  return (
    <Badge variant="light" size="sm" color={active === false ? 'gray' : 'teal'}>
      {active === false ? 'Inactive' : 'Active'}
    </Badge>
  );
}
