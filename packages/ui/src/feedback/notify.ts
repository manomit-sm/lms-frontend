import { errorMessage } from '@lms/api';
import { notifications } from '@mantine/notifications';

export function showError(error: unknown, title = 'That did not work') {
  notifications.show({ color: 'red', title, message: errorMessage(error) });
}

export function showSuccess(message: string) {
  notifications.show({ color: 'teal', message });
}
