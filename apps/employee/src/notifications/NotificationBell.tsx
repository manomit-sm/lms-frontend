import { EmptyState, QueryError } from '@lms/ui';
import {
  ActionIcon,
  Anchor,
  Button,
  Divider,
  Group,
  Indicator,
  Popover,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../runtime';
import { NotificationItem } from './NotificationItem';
import { NOTIFICATIONS_PATH, UNREAD_COUNT_PATH } from './paths';
import { useMarkAllRead, useOpenNotification } from './useOpenNotification';

const LATEST = 6;

/** Header bell: the unread count (kept live by the stream), and the latest notifications on click. */
export function NotificationBell() {
  const [opened, setOpened] = useState(false);
  const unread = api.query.useQuery('get', UNREAD_COUNT_PATH);
  const latest = api.query.useQuery(
    'get',
    NOTIFICATIONS_PATH,
    { params: { query: { size: LATEST } } },
    { enabled: opened },
  );
  const openNotification = useOpenNotification();
  const markAllRead = useMarkAllRead();
  const count = unread.data?.count ?? 0;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width="min(380px, calc(100vw - 32px))"
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <Indicator label={count > 99 ? '99+' : count} size={16} offset={6} disabled={count === 0} color="red">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
            onClick={() => setOpened((current) => !current)}
          >
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="md" py="sm">
          <Text fw={600}>Notifications</Text>
          <Button
            variant="subtle"
            size="compact-sm"
            disabled={count === 0}
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate({})}
          >
            Mark all read
          </Button>
        </Group>
        <Divider />
        <Stack gap={0} mah={420} style={{ overflowY: 'auto' }}>
          {latest.isError && (
            <div style={{ padding: 'var(--mantine-spacing-md)' }}>
              <QueryError error={latest.error} onRetry={() => void latest.refetch()} />
            </div>
          )}
          {latest.isPending && <Skeleton h={160} m="md" w="auto" />}
          {latest.data?.content?.length === 0 && (
            <EmptyState icon={<IconBell size={22} />} title="No notifications yet" />
          )}
          {latest.data?.content?.map((notification, index) => (
            <Fragment key={notification.id}>
              {index > 0 && <Divider />}
              <NotificationItem
                notification={notification}
                onSelect={(selected) => {
                  setOpened(false);
                  openNotification(selected);
                }}
              />
            </Fragment>
          ))}
        </Stack>
        <Divider />
        <Group justify="center" py="xs">
          <Anchor component={Link} to="/notifications" size="sm" onClick={() => setOpened(false)}>
            See all notifications
          </Anchor>
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}
