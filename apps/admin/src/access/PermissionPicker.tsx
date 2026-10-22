import { Checkbox, Group, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import type { PermissionInfo } from '../types';
import { groupPermissions, moduleLabel } from './permissionGroups';

export interface PermissionPickerProps {
  permissions: readonly PermissionInfo[];
  value: readonly string[];
  onChange?: (value: string[]) => void;
  /** Read-only, e.g. for system roles. */
  readOnly?: boolean;
  /** What the signed-in admin holds: nobody can grant a permission they don't have. */
  held: ReadonlySet<string>;
}

/** Permissions grouped by module, each module with a check-all box. */
export function PermissionPicker({ permissions, value, onChange, readOnly, held }: PermissionPickerProps) {
  const selected = new Set(value);

  function set(codes: string[], on: boolean) {
    const next = new Set(selected);
    codes.forEach((code) => (on ? next.add(code) : next.delete(code)));
    onChange?.([...next].sort());
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" verticalSpacing="lg">
      {groupPermissions(permissions).map(({ module, permissions: group }) => {
        // Only what the admin may grant can be ticked; what they can't stays as it is
        const grantable = group.map((permission) => permission.code!).filter((code) => held.has(code));
        const on = group.filter((permission) => selected.has(permission.code!)).length;
        return (
          <Stack key={module} gap="xs">
            <Checkbox
              label={<Text fw={600}>{moduleLabel(module)}</Text>}
              checked={on === group.length}
              indeterminate={on > 0 && on < group.length}
              disabled={readOnly || grantable.length === 0}
              onChange={(event) => set(grantable, event.currentTarget.checked)}
            />
            <Stack gap={6} pl="lg">
              {group.map((permission) => {
                const canGrant = held.has(permission.code!);
                const box = (
                  <Checkbox
                    key={permission.code}
                    label={
                      <Group gap={6} wrap="nowrap" align="baseline">
                        <Text size="sm" ff="monospace">
                          {permission.code}
                        </Text>
                      </Group>
                    }
                    description={permission.description}
                    checked={selected.has(permission.code!)}
                    disabled={readOnly || !canGrant}
                    onChange={(event) => set([permission.code!], event.currentTarget.checked)}
                  />
                );
                return readOnly || canGrant ? (
                  box
                ) : (
                  <Tooltip
                    key={permission.code}
                    label="You can’t grant a permission you don’t have"
                    position="top-start"
                  >
                    <div>{box}</div>
                  </Tooltip>
                );
              })}
            </Stack>
          </Stack>
        );
      })}
    </SimpleGrid>
  );
}
