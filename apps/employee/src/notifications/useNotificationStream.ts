import { runEventStream, type ServerEvent } from '@lms/api';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { useNavigate } from 'react-router';
import { refreshApprovalData, refreshLeaveData } from '../leave/refresh';
import type { Notification } from '../leave/types';
import { config, sessionStore } from '../runtime';
import { NOTIFICATIONS_PATH, UNREAD_COUNT_PATH } from './paths';
import { isForApprover, notificationTarget } from './target';

/**
 * Keeps the notification stream open while signed in: the unread count stays current, each new
 * notification pops up, and the data it is about (approvals, leave, balances) is refetched.
 */
export function useNotificationStream(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const onEvent = useEffectEvent((event: ServerEvent) => {
    if (event.event === 'unread-count') {
      queryClient.setQueryData(['get', UNREAD_COUNT_PATH], JSON.parse(event.data));
      return;
    }
    if (event.event !== 'notification') {
      return;
    }
    const notification = JSON.parse(event.data) as Notification;
    void queryClient.invalidateQueries({ queryKey: ['get', NOTIFICATIONS_PATH] });
    void queryClient.invalidateQueries({ queryKey: ['get', UNREAD_COUNT_PATH] });
    void (isForApprover(notification.type)
      ? refreshApprovalData(queryClient)
      : refreshLeaveData(queryClient));
    const target = notificationTarget(notification);
    notifications.show({
      title: notification.title,
      message: notification.message,
      color: 'teal',
      autoClose: 8000,
      style: target ? { cursor: 'pointer' } : undefined,
      onClick: target ? () => navigate(target) : undefined,
    });
  });

  // Anything that arrived while disconnected is in the list, not the stream
  const onOpen = useEffectEvent(() => {
    void queryClient.invalidateQueries({ queryKey: ['get', NOTIFICATIONS_PATH] });
  });

  useEffect(() => {
    const controller = new AbortController();
    void runEventStream({
      url: `${config.apiBaseUrl}${NOTIFICATIONS_PATH}/stream`,
      getAccessToken: () => sessionStore.get()?.accessToken ?? null,
      onUnauthorized: () => sessionStore.clear(),
      onEvent,
      onOpen,
      signal: controller.signal,
    });
    return () => controller.abort();
  }, []);
}
