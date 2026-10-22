import { formatRelativeTime } from '@lms/ui';
import { Box, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import {
  IconAlarm,
  IconArrowUpRight,
  IconCalendarOff,
  IconCircleCheck,
  IconCircleX,
  IconInbox,
  IconPlaneDeparture,
  IconScale,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { Notification } from '../leave/types';
import type { NotificationType } from './target';

const LOOK: Record<NotificationType, { icon: ReactNode; color: string }> = {
  APPROVAL_REQUESTED: { icon: <IconInbox size={16} />, color: 'blue' },
  APPROVAL_REMINDER: { icon: <IconAlarm size={16} />, color: 'yellow' },
  APPROVAL_ESCALATED: { icon: <IconArrowUpRight size={16} />, color: 'orange' },
  LEAVE_APPROVED: { icon: <IconCircleCheck size={16} />, color: 'teal' },
  LEAVE_REJECTED: { icon: <IconCircleX size={16} />, color: 'red' },
  LEAVE_CANCELLED: { icon: <IconCalendarOff size={16} />, color: 'gray' },
  CANCELLATION_APPROVED: { icon: <IconCircleCheck size={16} />, color: 'teal' },
  CANCELLATION_REJECTED: { icon: <IconCircleX size={16} />, color: 'red' },
  LEAVE_STARTING: { icon: <IconPlaneDeparture size={16} />, color: 'blue' },
  BALANCE_ADJUSTED: { icon: <IconScale size={16} />, color: 'grape' },
};

/** One notification; unread ones are bold with a dot. Selecting it marks it read and opens its subject. */
export function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}) {
  const look = notification.type ? LOOK[notification.type] : undefined;
  const unread = !notification.readAt;
  return (
    <UnstyledButton
      onClick={() => onSelect(notification)}
      px="md"
      py="sm"
      w="100%"
      aria-label={`${unread ? 'Unread: ' : ''}${notification.title}`}
      style={{ display: 'block' }}
    >
      <Group align="flex-start" wrap="nowrap" gap="sm">
        <ThemeIcon variant="light" color={look?.color ?? 'gray'} radius="xl" size={30}>
          {look?.icon}
        </ThemeIcon>
        <Stack gap={2} miw={0} style={{ flex: 1 }}>
          <Text size="sm" fw={unread ? 600 : 400}>
            {notification.title}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={3}>
            {notification.message}
          </Text>
          <Text size="xs" c="dimmed">
            {formatRelativeTime(notification.createdAt)}
          </Text>
        </Stack>
        {unread && (
          <Box
            mt={6}
            w={8}
            h={8}
            style={{ borderRadius: '50%', flexShrink: 0, background: 'var(--mantine-primary-color-filled)' }}
            aria-hidden
          />
        )}
      </Group>
    </UnstyledButton>
  );
}
