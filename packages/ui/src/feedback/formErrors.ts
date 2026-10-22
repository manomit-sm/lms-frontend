import { errorMessage, isApiError } from '@lms/api';

/**
 * Puts an API error where the form shows it: field errors next to their fields (`setErrors`, e.g.
 * Mantine form's), anything else as one message for the form to show. Returns that message, or null
 * when every problem went to a field.
 */
export function applyFieldErrors(
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
): string | null {
  const byField = isApiError(error) ? error.fieldErrorMap() : {};
  if (Object.keys(byField).length > 0) {
    setErrors(byField);
    return null;
  }
  return errorMessage(error);
}
