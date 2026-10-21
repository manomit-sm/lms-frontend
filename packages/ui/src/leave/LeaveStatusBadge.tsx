import { Badge } from '@mantine/core';
import { LEAVE_STATUS, type LeaveStatus } from './leaveStatus';

export function LeaveStatusBadge({
  status,
  size = 'sm',
}: {
  status: LeaveStatus | undefined;
  size?: 'xs' | 'sm' | 'md';
}) {
  if (!status) {
    return null;
  }
  const { label, color } = LEAVE_STATUS[status];
  return (
    <Badge color={color} variant="light" size={size}>
      {label}
    </Badge>
  );
}
