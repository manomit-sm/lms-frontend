import { EmptyState, PageHeader, QueryError } from '@lms/ui';
import { Button, Card, Divider, Group, Pagination, SegmentedControl, Skeleton, Stack } from '@mantine/core';
import { IconBell, IconChecks } from '@tabler/icons-react';
import { Fragment } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../runtime';
import { NotificationItem } from './NotificationItem';
import { NOTIFICATIONS_PATH, UNREAD_COUNT_PATH } from './paths';
import { useMarkAllRead, useOpenNotification } from './useOpenNotification';

const PAGE_SIZE = 20;

/** Every notification, newest first; `?unread=1` shows unread ones only. */
export function NotificationsPage() {
  const [search, setSearch] = useSearchParams();
  const unreadOnly = search.get('unread') === '1';
  const page = Math.max(1, Number(search.get('page')) || 1);
  const list = api.query.useQuery('get', NOTIFICATIONS_PATH, {
    params: { query: { unreadOnly, page: page - 1, size: PAGE_SIZE } },
  });
  const unread = api.query.useQuery('get', UNREAD_COUNT_PATH);
  const openNotification = useOpenNotification();
  const markAllRead = useMarkAllRead();
  const rows = list.data?.content ?? [];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Decisions on your leave, and requests waiting for you."
        actions={
          <Button
            variant="default"
            leftSection={<IconChecks size={16} />}
            disabled={(unread.data?.count ?? 0) === 0}
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate({})}
          >
            Mark all read
          </Button>
        }
      />
      <SegmentedControl
        mb="md"
        aria-label="Which notifications"
        data={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: `Unread${unread.data?.count ? ` (${unread.data.count})` : ''}` },
        ]}
        value={unreadOnly ? 'unread' : 'all'}
        onChange={(value) => setSearch(value === 'unread' ? { unread: '1' } : {})}
      />
      {list.isError && <QueryError error={list.error} onRetry={() => void list.refetch()} />}
      {list.isPending && <Skeleton h={240} />}
      {list.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<IconBell size={22} />}
              title={unreadOnly ? 'Nothing unread' : 'No notifications yet'}
              description="You are told here when leave is approved or rejected, and when a request waits for you."
            />
          ) : (
            <Stack gap={0}>
              {rows.map((notification, index) => (
                <Fragment key={notification.id}>
                  {index > 0 && <Divider />}
                  <NotificationItem notification={notification} onSelect={openNotification} />
                </Fragment>
              ))}
            </Stack>
          )}
        </Card>
      )}
      {(list.data?.totalPages ?? 0) > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            value={page}
            total={list.data?.totalPages ?? 1}
            onChange={(next) => {
              const params = new URLSearchParams(search);
              params.set('page', String(next));
              setSearch(params);
            }}
          />
        </Group>
      )}
    </>
  );
}
