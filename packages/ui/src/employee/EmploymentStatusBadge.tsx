import { Badge } from '@mantine/core';
import { EMPLOYMENT_STATUS, type EmploymentStatus } from './employeeLabels';

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus | undefined }) {
  if (!status) {
    return null;
  }
  const { label, color } = EMPLOYMENT_STATUS[status];
  return (
    <Badge variant="light" color={color} size="sm">
      {label}
    </Badge>
  );
}
