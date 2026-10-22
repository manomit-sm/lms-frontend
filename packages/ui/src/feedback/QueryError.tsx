import { errorMessage } from '@lms/api';
import { Alert, Button, Group } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

/** Inline error for a query that failed, with a retry. */
export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Could not load this">
      <Group justify="space-between" wrap="nowrap" gap="md">
        <span>{errorMessage(error)}</span>
        {onRetry && (
          <Button size="xs" variant="white" color="red" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Group>
    </Alert>
  );
}

type Failable = { isError: boolean; error: unknown; refetch: () => unknown };

/** One inline error for several queries (a form's option lists, say): the first failure, and a retry of every failed one. */
export function QueriesError({ queries }: { queries: Failable[] }) {
  const failed = queries.filter((query) => query.isError);
  const [first] = failed;
  if (!first) {
    return null;
  }
  return <QueryError error={first.error} onRetry={() => failed.forEach((query) => void query.refetch())} />;
}
