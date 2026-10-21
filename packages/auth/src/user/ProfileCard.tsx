import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { CurrentUser } from './currentUser';

const EMPLOYMENT_STATUS: Record<string, string> = {
  PROBATION: 'On probation',
  ACTIVE: 'Active',
  NOTICE_PERIOD: 'Serving notice',
  INACTIVE: 'Inactive',
  EXITED: 'Exited',
};

/** A labelled value; text values wrap anywhere (long emails), missing ones show a dash. */
function Field({ label, value }: { label: string; value: ReactNode }) {
  const missing = value === undefined || value === null || value === '';
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      {missing ? (
        <Text c="dimmed">-</Text>
      ) : typeof value === 'string' ? (
        <Text style={{ overflowWrap: 'anywhere' }}>{value}</Text>
      ) : (
        value
      )}
    </Stack>
  );
}

function formatDate(isoDate: string | undefined): string | undefined {
  return isoDate
    ? new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : undefined;
}

/** The signed-in user as the API sees them: account, roles and the linked employee record. */
export function ProfileCard({ user }: { user: CurrentUser }) {
  const { me } = user;
  const employee = me.employee;
  return (
    <Stack gap="md">
      {!employee && (
        <Alert icon={<IconInfoCircle size={18} />} color="blue" title="No employee record">
          Your account isn’t linked to an employee, so leave features don’t apply to you. HR can link one by
          adding an employee with your email address.
        </Alert>
      )}
      <Card withBorder padding="lg">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
          {employee && <Field label="Name" value={user.name} />}
          <Field label="Email" value={me.email} />
          <Field label="Organisation" value={me.tenant?.key} />
          <Field
            label="Roles"
            value={
              <Group gap={6}>
                {(me.roles ?? []).map((role) => (
                  <Badge key={role} variant="light">
                    {role}
                  </Badge>
                ))}
              </Group>
            }
          />
          {employee && (
            <>
              <Field label="Employee code" value={employee.employeeCode} />
              <Field
                label="Employment"
                value={
                  employee.employmentStatus
                    ? (EMPLOYMENT_STATUS[employee.employmentStatus] ?? employee.employmentStatus)
                    : undefined
                }
              />
              <Field label="Joined" value={formatDate(employee.joiningDate)} />
              {employee.probationEndDate && (
                <Field label="Probation ends" value={formatDate(employee.probationEndDate)} />
              )}
            </>
          )}
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
