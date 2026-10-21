import { Box, Group, Text } from '@mantine/core';

/** A leave type with its colour, as the tenant configured it. */
export function LeaveTypeLabel({
  name,
  color,
  size = 'sm',
}: {
  name: string | undefined;
  color: string | undefined;
  size?: 'xs' | 'sm' | 'md';
}) {
  return (
    <Group gap={8} wrap="nowrap">
      <Box
        w={10}
        h={10}
        style={{ borderRadius: '50%', flexShrink: 0, background: color ?? 'var(--mantine-color-gray-5)' }}
        aria-hidden
      />
      <Text size={size} truncate>
        {name}
      </Text>
    </Group>
  );
}
