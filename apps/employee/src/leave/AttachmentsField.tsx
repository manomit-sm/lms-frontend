import { errorMessage } from '@lms/api';
import { ActionIcon, Button, FileButton, Group, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconPaperclip, IconX } from '@tabler/icons-react';
import { ATTACHMENT_TYPES } from './attachments';

export interface AttachmentItem {
  /** Local id, until the upload has an attachment id. */
  key: string;
  name: string;
  status: 'uploading' | 'uploaded' | 'failed';
  attachmentId?: string;
  error?: unknown;
}

export function AttachmentsField({
  items,
  onAdd,
  onRemove,
  disabled,
}: {
  items: AttachmentItem[];
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        Attachments
      </Text>
      {items.map((item) => (
        <Group key={item.key} gap="xs" wrap="nowrap">
          {item.status === 'uploading' && <Loader size={14} aria-label="Uploading" />}
          {item.status === 'uploaded' && <IconCheck size={16} color="var(--mantine-color-teal-6)" />}
          {item.status === 'failed' && <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />}
          <Stack gap={0} miw={0} style={{ flex: 1 }}>
            <Text size="sm" truncate>
              {item.name}
            </Text>
            {item.status === 'failed' && (
              <Text size="xs" c="red">
                {errorMessage(item.error)}
              </Text>
            )}
          </Stack>
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={`Remove ${item.name}`}
            onClick={() => onRemove(item.key)}
            disabled={item.status === 'uploading'}
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Group>
        <FileButton onChange={onAdd} accept={ATTACHMENT_TYPES.join(',')} multiple disabled={disabled}>
          {(props) => (
            <Button {...props} variant="default" size="xs" leftSection={<IconPaperclip size={14} />}>
              Attach a file
            </Button>
          )}
        </FileButton>
        <Text size="xs" c="dimmed">
          PDF, JPEG or PNG, up to 10 MB
        </Text>
      </Group>
    </Stack>
  );
}
