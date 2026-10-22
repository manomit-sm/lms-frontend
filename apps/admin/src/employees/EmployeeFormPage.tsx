import {
  applyFieldErrors,
  EMPLOYMENT_STATUS,
  EMPLOYMENT_TYPE,
  FormError,
  PageHeader,
  QueriesError,
  QueryError,
  showSuccess,
  type EmploymentStatus,
  type EmploymentType,
} from '@lms/ui';
import { Anchor, Button, Card, Grid, Group, Select, Skeleton, Stack, TextInput, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconArrowLeft } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Employee, EmployeeRequest } from '../types';
import { EmployeeSelect } from './EmployeeSelect';

type Gender = NonNullable<EmployeeRequest['gender']>;

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNDISCLOSED', label: 'Prefer not to say' },
];

// Exiting has its own action, with an exit date
const STATUSES = (Object.keys(EMPLOYMENT_STATUS) as EmploymentStatus[])
  .filter((status) => status !== 'EXITED')
  .map((status) => ({ value: status, label: EMPLOYMENT_STATUS[status].label }));

const TYPES = (Object.keys(EMPLOYMENT_TYPE) as EmploymentType[]).map((type) => ({
  value: type,
  label: EMPLOYMENT_TYPE[type],
}));

interface EmployeeForm {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender | null;
  departmentId: string | null;
  designationId: string | null;
  locationId: string | null;
  reportingManagerId: string | null;
  workScheduleId: string | null;
  employmentType: EmploymentType | null;
  employmentStatus: EmploymentStatus | null;
  joiningDate: string | null;
  probationEndDate: string | null;
}

function initialValues(employee: Employee | undefined): EmployeeForm {
  return {
    employeeCode: employee?.employeeCode ?? '',
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    gender: employee?.gender ?? null,
    departmentId: employee?.department?.id ?? null,
    designationId: employee?.designation?.id ?? null,
    locationId: employee?.location?.id ?? null,
    reportingManagerId: employee?.reportingManager?.id ?? null,
    workScheduleId: employee?.workScheduleId ?? null,
    employmentType: employee?.employmentType ?? 'FULL_TIME',
    employmentStatus: employee?.employmentStatus ?? 'PROBATION',
    joiningDate: employee?.joiningDate ?? null,
    probationEndDate: employee?.probationEndDate ?? null,
  };
}

const required = (what: string) => (value: unknown) =>
  (typeof value === 'string' ? value.trim() : value) ? null : `Enter ${what}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card withBorder padding="lg">
      <Title order={4} mb="md">
        {title}
      </Title>
      <Grid gap="md">{children}</Grid>
    </Card>
  );
}

const half = { base: 12, sm: 6 };

function Form({ employee }: { employee?: Employee }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<EmployeeForm>({
    initialValues: initialValues(employee),
    validate: {
      employeeCode: required('a code'),
      firstName: required('a first name'),
      lastName: required('a last name'),
      email: (value) => (/^\S+@\S+\.\S+$/.test(value.trim()) ? null : 'Enter an email address'),
      departmentId: required('a department'),
      employmentType: required('the employment type'),
      employmentStatus: required('the employment status'),
      joiningDate: required('the joining date'),
      probationEndDate: (value, values) =>
        value && values.joiningDate && value < values.joiningDate
          ? 'Must be on or after the joining date'
          : null,
    },
  });
  const departments = api.query.useQuery('get', '/api/v1/departments');
  const designations = api.query.useQuery('get', '/api/v1/designations');
  const locations = api.query.useQuery('get', '/api/v1/locations');
  const schedules = api.query.useQuery('get', '/api/v1/work-schedules');
  const create = api.query.useMutation('post', '/api/v1/employees', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/employees/{employeeId}', {
    meta: { handlesError: true },
  });

  // Inactive records can't be picked for new choices, but the current one stays visible
  const options = <T extends { id?: string; name?: string; active?: boolean }>(
    items: T[] | undefined,
    current: string | null,
  ) =>
    (items ?? [])
      .filter((item) => item.active !== false || item.id === current)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      .map((item) => ({ value: item.id!, label: item.name ?? '' }));

  function submit(values: EmployeeForm) {
    setFormError(null);
    const body: EmployeeRequest = {
      employeeCode: values.employeeCode.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      gender: values.gender ?? undefined,
      departmentId: values.departmentId!,
      designationId: values.designationId ?? undefined,
      locationId: values.locationId ?? undefined,
      reportingManagerId: values.reportingManagerId ?? undefined,
      workScheduleId: values.workScheduleId ?? undefined,
      employmentType: values.employmentType!,
      employmentStatus: values.employmentStatus!,
      joiningDate: values.joiningDate!,
      probationEndDate: values.probationEndDate ?? undefined,
    };
    const onError = (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors));
    const onSuccess = async (saved: Employee) => {
      await invalidate(
        queryClient,
        '/api/v1/employees',
        '/api/v1/employees/{employeeId}',
        '/api/v1/departments',
      );
      showSuccess(employee ? 'Employee saved.' : `${saved.fullName} added.`);
      navigate(`/employees/${saved.id}`);
    };
    if (employee?.id) {
      update.mutate({ params: { path: { employeeId: employee.id } }, body }, { onSuccess, onError });
    } else {
      create.mutate({ body }, { onSuccess, onError });
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="lg" maw={880}>
        <QueriesError queries={[departments, designations, locations, schedules]} />
        <FormError message={formError} />
        <Section title="Person">
          <Grid.Col span={half}>
            <TextInput label="First name" required maxLength={100} {...form.getInputProps('firstName')} />
          </Grid.Col>
          <Grid.Col span={half}>
            <TextInput label="Last name" required maxLength={100} {...form.getInputProps('lastName')} />
          </Grid.Col>
          <Grid.Col span={half}>
            <TextInput
              label="Email"
              description={
                employee
                  ? undefined
                  : 'They get a sign-in for this address (an existing user with it is linked).'
              }
              required
              type="email"
              maxLength={254}
              {...form.getInputProps('email')}
            />
          </Grid.Col>
          <Grid.Col span={half}>
            <TextInput label="Phone" maxLength={40} {...form.getInputProps('phone')} />
          </Grid.Col>
          <Grid.Col span={half}>
            <Select label="Gender" data={GENDERS} clearable {...form.getInputProps('gender')} />
          </Grid.Col>
        </Section>

        <Section title="Position">
          <Grid.Col span={half}>
            <TextInput
              label="Employee code"
              required
              maxLength={40}
              {...form.getInputProps('employeeCode')}
            />
          </Grid.Col>
          <Grid.Col span={half}>
            <Select
              label="Department"
              required
              searchable
              data={options(departments.data, form.values.departmentId)}
              {...form.getInputProps('departmentId')}
            />
          </Grid.Col>
          <Grid.Col span={half}>
            <Select
              label="Designation"
              searchable
              clearable
              data={options(designations.data, form.values.designationId)}
              {...form.getInputProps('designationId')}
            />
          </Grid.Col>
          <Grid.Col span={half}>
            <EmployeeSelect
              label="Reports to"
              value={form.values.reportingManagerId}
              selected={
                employee?.reportingManager?.id
                  ? { id: employee.reportingManager.id, name: employee.reportingManager.name ?? '' }
                  : null
              }
              exclude={employee?.id ? new Set([employee.id]) : undefined}
              onChange={(value) => form.setFieldValue('reportingManagerId', value)}
              error={form.errors.reportingManagerId as string | undefined}
            />
          </Grid.Col>
          <Grid.Col span={half}>
            <Select
              label="Location"
              searchable
              clearable
              data={options(locations.data, form.values.locationId)}
              {...form.getInputProps('locationId')}
            />
          </Grid.Col>
          <Grid.Col span={half}>
            <Select
              label="Work schedule"
              placeholder="The location’s, or the default"
              clearable
              data={(schedules.data ?? []).map((schedule) => ({
                value: schedule.id!,
                label: schedule.name ?? '',
              }))}
              {...form.getInputProps('workScheduleId')}
            />
          </Grid.Col>
        </Section>

        <Section title="Employment">
          <Grid.Col span={half}>
            <Select label="Type" required data={TYPES} {...form.getInputProps('employmentType')} />
          </Grid.Col>
          <Grid.Col span={half}>
            <Select label="Status" required data={STATUSES} {...form.getInputProps('employmentStatus')} />
          </Grid.Col>
          <Grid.Col span={half}>
            <DatePickerInput
              label="Joining date"
              required
              valueFormat="D MMM YYYY"
              {...form.getInputProps('joiningDate')}
            />
          </Grid.Col>
          <Grid.Col span={half}>
            <DatePickerInput
              label="Probation ends"
              clearable
              valueFormat="D MMM YYYY"
              minDate={form.values.joiningDate ?? undefined}
              {...form.getInputProps('probationEndDate')}
            />
          </Grid.Col>
        </Section>

        <Group justify="flex-end">
          <Button
            variant="default"
            component={Link}
            to={employee ? `/employees/${employee.id}` : '/employees'}
          >
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            {employee ? 'Save' : 'Add employee'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Anchor
      component={Link}
      to={to}
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> {label}
    </Anchor>
  );
}

export function NewEmployeePage() {
  return (
    <>
      <BackLink to="/employees" label="Employees" />
      <PageHeader title="Add employee" />
      <Form />
    </>
  );
}

export function EditEmployeePage() {
  const { employeeId = '' } = useParams();
  const employee = api.query.useQuery('get', '/api/v1/employees/{employeeId}', {
    params: { path: { employeeId } },
  });
  return (
    <>
      <BackLink to={`/employees/${employeeId}`} label={employee.data?.fullName ?? 'Employee'} />
      <PageHeader title="Edit employee" />
      {employee.isError && <QueryError error={employee.error} onRetry={() => void employee.refetch()} />}
      {employee.isPending && <Skeleton h={480} maw={880} />}
      {employee.data && <Form key={employee.data.updatedAt} employee={employee.data} />}
    </>
  );
}
