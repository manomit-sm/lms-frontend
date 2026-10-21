import { ProfileCard, useCurrentUser } from '@lms/auth';
import { PageHeader } from '@lms/ui';
import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';

export function HomePage() {
  const user = useCurrentUser();
  const permissions = [...(user.me.permissions ?? [])].sort();
  return (
    <Stack gap="lg">
      <PageHeader
        title="Administration"
        description={`Signed in to ${user.me.tenant?.key ?? 'your organisation'}`}
      />
      <ProfileCard user={user} />
      <Card withBorder padding="lg">
        <Title order={4} mb={4}>
          Your permissions
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          What your roles allow in this organisation.
        </Text>
        <Group gap={6}>
          {permissions.map((permission) => (
            <Badge key={permission} variant="outline" color="gray">
              {permission}
            </Badge>
          ))}
        </Group>
      </Card>
    </Stack>
  );
}
