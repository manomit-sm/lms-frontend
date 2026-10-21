import { Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { ReactNode } from 'react';

/** A full-area message: not found, no access, something failed - with what the user can do next. */
export function MessagePage({
  icon,
  title,
  description,
  actions,
  fullScreen = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  fullScreen?: boolean;
}) {
  return (
    <Center mih={fullScreen ? '100vh' : 360} p="md">
      <Stack align="center" gap="sm" maw={480} ta="center">
        {icon && (
          <ThemeIcon size={56} radius="xl" variant="light">
            {icon}
          </ThemeIcon>
        )}
        <Title order={2}>{title}</Title>
        {description && <Text c="dimmed">{description}</Text>}
        {actions && (
          <Stack gap="xs" mt="sm" align="center">
            {actions}
          </Stack>
        )}
      </Stack>
    </Center>
  );
}
