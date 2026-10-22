import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { Notification } from '../leave/types';
import { api } from '../runtime';
import { NOTIFICATIONS_PATH, UNREAD_COUNT_PATH } from './paths';
import { notificationTarget } from './target';

function useRefreshNotifications() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['get', NOTIFICATIONS_PATH] }),
      queryClient.invalidateQueries({ queryKey: ['get', UNREAD_COUNT_PATH] }),
    ]);
}

/** Marks a notification read (if it isn't) and goes to what it is about. */
export function useOpenNotification(): (notification: Notification) => void {
  const navigate = useNavigate();
  const refresh = useRefreshNotifications();
  const markRead = api.query.useMutation('post', '/api/v1/notifications/{id}/read', {
    onSuccess: () => refresh(),
  });
  return (notification) => {
    if (!notification.readAt && notification.id) {
      markRead.mutate({ params: { path: { id: notification.id } } });
    }
    const target = notificationTarget(notification);
    if (target) {
      navigate(target);
    }
  };
}

export function useMarkAllRead() {
  const refresh = useRefreshNotifications();
  return api.query.useMutation('post', '/api/v1/notifications/read-all', { onSuccess: () => refresh() });
}
