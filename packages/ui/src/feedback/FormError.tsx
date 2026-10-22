import { Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

/** A form's error that belongs to no single field (e.g. a rule the backend enforces). */
export function FormError({ message }: { message: string | null }) {
  return message ? (
    <Alert color="red" icon={<IconAlertTriangle size={18} />} role="alert">
      {message}
    </Alert>
  ) : null;
}
