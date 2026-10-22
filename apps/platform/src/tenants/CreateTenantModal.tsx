import { isApiError } from '@lms/api';
import { applyFieldErrors, FormError, showSuccess } from '@lms/ui';
import { Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../runtime';
import { suggestKey } from './tenantLabels';

const KEY = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
const TIMEZONES = Intl.supportedValuesOf('timeZone');

/** Provisions a tenant: its schema is created and migrated, and its first admin invited. */
export function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [timezone, setTimezone] = useState<string | null>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [adminEmail, setAdminEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const create = api.query.useMutation('post', '/platform/tenants', { meta: { handlesError: true } });

  function submit() {
    const problems: Record<string, string> = {};
    if (!name.trim()) problems.name = 'Enter the organisation’s name';
    if (!KEY.test(key)) problems.key = '3–40 lowercase letters, digits and -, starting with a letter';
    if (!timezone) problems.defaultTimezone = 'Pick a timezone';
    if (!/^\S+@\S+\.\S+$/.test(adminEmail.trim())) problems.adminEmail = 'Enter an email address';
    setErrors(problems);
    setFormError(null);
    if (Object.keys(problems).length > 0) {
      return;
    }
    create.mutate(
      { body: { name: name.trim(), key, defaultTimezone: timezone!, adminEmail: adminEmail.trim() } },
      {
        onSuccess: async (tenant) => {
          await queryClient.invalidateQueries({ queryKey: ['get', '/platform/tenants'] });
          showSuccess(`${tenant.name} is ready; ${adminEmail.trim()} has been invited.`);
          navigate(`/tenants/${tenant.id}`);
        },
        onError: async (error) => {
          // The tenant can exist with its admin invitation failed: the detail page can retry that
          if (isApiError(error) && error.errorCode === 'TENANT_ADMIN_SETUP_FAILED') {
            await queryClient.invalidateQueries({ queryKey: ['get', '/platform/tenants'] });
          }
          if (isApiError(error) && error.errorCode === 'TENANT_KEY_TAKEN') {
            setErrors({ key: 'Another tenant has this key' });
            return;
          }
          setFormError(applyFieldErrors(error, setErrors));
        },
      },
    );
  }

  return (
    <Modal opened onClose={onClose} title={<Text fw={600}>Add tenant</Text>}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Stack>
          <FormError message={formError} />
          <TextInput
            label="Organisation"
            required
            maxLength={200}
            value={name}
            error={errors.name}
            onChange={(event) => {
              setName(event.currentTarget.value);
              if (!keyEdited) setKey(suggestKey(event.currentTarget.value));
            }}
            data-autofocus
          />
          <TextInput
            label="Key"
            description="Permanent: the tenant’s schema is named after it."
            required
            value={key}
            error={errors.key}
            onChange={(event) => {
              setKey(event.currentTarget.value.toLowerCase());
              setKeyEdited(true);
            }}
          />
          <Select
            label="Timezone"
            required
            searchable
            data={TIMEZONES}
            limit={50}
            value={timezone}
            error={errors.defaultTimezone}
            onChange={setTimezone}
          />
          <TextInput
            label="First admin"
            description="Invited as the tenant admin."
            required
            type="email"
            value={adminEmail}
            error={errors.adminEmail}
            onChange={(event) => setAdminEmail(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create tenant
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
