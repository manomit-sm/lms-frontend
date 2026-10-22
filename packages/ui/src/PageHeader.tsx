import { Group, Stack, Text, Title } from '@mantine/core';
import { type ReactNode, useEffect } from 'react';

/** The portal's own title, from index.html (e.g. "LMS · Admin"). */
const PORTAL_TITLE = document.title;

/** The page's heading, also used as the browser tab's title so each page announces itself. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  useEffect(() => {
    document.title = title ? `${title} · ${PORTAL_TITLE}` : PORTAL_TITLE;
    return () => {
      document.title = PORTAL_TITLE;
    };
  }, [title]);

  return (
    <Group justify="space-between" align="flex-start" mb="lg" gap="md">
      <Stack gap={4}>
        <Title order={2}>{title}</Title>
        {/* A div, not a p: descriptions may hold badges and other block content */}
        {description && (
          <Text component="div" c="dimmed" size="sm">
            {description}
          </Text>
        )}
      </Stack>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}
