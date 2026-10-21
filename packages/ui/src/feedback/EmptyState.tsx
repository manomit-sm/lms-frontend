import { Stack, Text, ThemeIcon } from '@mantine/core';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack align="center" gap={6} py="xl" ta="center">
      {icon && (
        <ThemeIcon size={44} radius="xl" variant="light" color="gray">
          {icon}
        </ThemeIcon>
      )}
      <Text fw={500}>{title}</Text>
      {description && (
        <Text size="sm" c="dimmed" maw={420}>
          {description}
        </Text>
      )}
      {action}
    </Stack>
  );
}
