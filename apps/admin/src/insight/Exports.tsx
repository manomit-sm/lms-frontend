import type { TenantSchemas } from '@lms/api';
import { formatDateTime, QueryError, showError } from '@lms/ui';
import { Badge, Button, Drawer, Group, Loader, Menu, Skeleton, Stack, Text } from '@mantine/core';
import { IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { api, config } from '../runtime';
import { REPORT_LABEL } from './reportLabels';

type ExportRequest = TenantSchemas['schemas']['ExportRequest'];
type ExportJob = TenantSchemas['schemas']['ExportResponse'];

const EXPORTS_PATH = '/api/v1/reports/exports';

const STATUS: Record<NonNullable<ExportJob['status']>, { label: string; color: string }> = {
  PENDING: { label: 'Waiting', color: 'gray' },
  RUNNING: { label: 'Generating', color: 'blue' },
  COMPLETED: { label: 'Ready', color: 'teal' },
  FAILED: { label: 'Failed', color: 'red' },
};

function sizeOf(bytes: number | undefined): string {
  if (!bytes) return '';
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Starts an export of a report with the filters on screen, as CSV or Excel. */
export function ExportMenu({
  request,
  onStarted,
}: {
  request: Omit<ExportRequest, 'format'>;
  onStarted: () => void;
}) {
  const queryClient = useQueryClient();
  const start = api.query.useMutation('post', EXPORTS_PATH);
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Button variant="default" leftSection={<IconFileSpreadsheet size={16} />} loading={start.isPending}>
          Export
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {(['CSV', 'XLSX'] as const).map((format) => (
          <Menu.Item
            key={format}
            onClick={() =>
              start.mutate(
                { body: { ...request, format } },
                {
                  onSuccess: async () => {
                    await queryClient.invalidateQueries({ queryKey: ['get', EXPORTS_PATH] });
                    onStarted();
                  },
                },
              )
            }
          >
            {format === 'CSV' ? 'CSV' : 'Excel (.xlsx)'}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

async function download(id: string) {
  // Download links expire: fetch a fresh one at the moment of downloading
  const { data } = await api.client.GET('/api/v1/reports/exports/{exportId}', {
    params: { path: { exportId: id } },
  });
  if (data?.downloadUrl) {
    window.location.assign(new URL(data.downloadUrl, config.apiBaseUrl || window.location.origin).toString());
  } else {
    showError(new Error('The file is not ready yet.'));
  }
}

/** The signed-in user's latest exports; refreshes itself while any is still being generated. */
export function ExportsDrawer({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const exports = api.query.useQuery(
    'get',
    EXPORTS_PATH,
    {},
    {
      enabled: opened,
      refetchInterval: (query) =>
        query.state.data?.some((job) => job.status === 'PENDING' || job.status === 'RUNNING') ? 1500 : false,
    },
  );
  return (
    <Drawer opened={opened} onClose={onClose} position="right" title={<Text fw={600}>Your exports</Text>}>
      {exports.isError && <QueryError error={exports.error} onRetry={() => void exports.refetch()} />}
      {exports.isPending && <Skeleton h={160} />}
      {exports.data?.length === 0 && (
        <Text size="sm" c="dimmed">
          No exports yet. Use Export on a report.
        </Text>
      )}
      <Stack gap="md">
        {exports.data?.map((job) => (
          <Group key={job.id} justify="space-between" wrap="nowrap" align="flex-start">
            <Stack gap={2} miw={0}>
              <Text size="sm" fw={500}>
                {job.report ? REPORT_LABEL[job.report] : 'Report'} · {job.format === 'XLSX' ? 'Excel' : 'CSV'}
              </Text>
              <Text size="xs" c="dimmed">
                {formatDateTime(job.createdAt)}
                {job.status === 'COMPLETED' && ` · ${job.rowCount ?? 0} rows · ${sizeOf(job.sizeBytes)}`}
              </Text>
              {job.error && (
                <Text size="xs" c="red">
                  {job.error}
                </Text>
              )}
            </Stack>
            {job.status === 'COMPLETED' ? (
              <Button
                size="compact-sm"
                variant="light"
                leftSection={<IconDownload size={14} />}
                onClick={() => void download(job.id!)}
              >
                Download
              </Button>
            ) : (
              job.status && (
                <Badge
                  variant="light"
                  color={STATUS[job.status].color}
                  leftSection={job.status === 'RUNNING' ? <Loader size={10} /> : undefined}
                >
                  {STATUS[job.status].label}
                </Badge>
              )
            )}
          </Group>
        ))}
      </Stack>
    </Drawer>
  );
}
