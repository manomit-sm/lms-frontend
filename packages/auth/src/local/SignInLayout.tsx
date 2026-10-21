import { Badge, Center, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function SignInLayout({ portalName, children }: { portalName: string; children: ReactNode }) {
  return (
    <Center mih="100vh" p="md" bg="var(--mantine-color-body)">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={520}>
        <Stack gap="lg">
          <Stack gap={4}>
            <Group justify="space-between" align="center">
              <Title order={2}>LMS</Title>
              <Badge variant="light" color="orange">
                Local development
              </Badge>
            </Group>
            <Text c="dimmed">Sign in to the {portalName}</Text>
          </Stack>
          {children}
        </Stack>
      </Paper>
    </Center>
  );
}
