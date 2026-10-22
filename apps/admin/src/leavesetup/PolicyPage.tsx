import { Permission } from '@lms/api';
import { useCurrentUser } from '@lms/auth';
import {
  applyFieldErrors,
  EMPLOYMENT_TYPE,
  FormError,
  PageHeader,
  QueriesError,
  QueryError,
  showSuccess,
  type EmploymentType,
} from '@lms/ui';
import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { LeavePolicy, LeavePolicyRequest, PolicyRule } from '../types';
import { ACCRUAL_LABEL, GENDER_LABEL, meaningfulRules } from './policyRules';

type Accrual = keyof typeof ACCRUAL_LABEL;
type Gender = NonNullable<PolicyRule['gender']>;

/** Number inputs hold '' while empty; the API wants the field left out. */
type Amount = number | string;
const amount = (value: Amount) => (typeof value === 'number' ? value : undefined);

interface PolicyForm {
  leaveTypeId: string | null;
  name: string;
  description: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  entitlementDays: Amount;
  accrualMethod: Accrual;
  prorateOnJoining: boolean;
  carryForwardMaxDays: Amount;
  carryForwardExpiryMonths: Amount;
  negativeBalanceLimit: Amount;
  maxConsecutiveDays: Amount;
  minNoticeDays: Amount;
  backdatingAllowedDays: Amount;
  attachmentRequiredAfterDays: Amount;
  allowedDuringProbation: boolean;
  sandwichRule: boolean;
  active: boolean;
  appliesTo: PolicyRule[];
}

function initialValues(policy: LeavePolicy | undefined, leaveTypeId: string | null): PolicyForm {
  return {
    leaveTypeId: policy?.leaveType?.id ?? leaveTypeId,
    name: policy?.name ?? '',
    description: policy?.description ?? '',
    effectiveFrom: policy?.effectiveFrom ?? null,
    effectiveTo: policy?.effectiveTo ?? null,
    entitlementDays: policy?.entitlementDays ?? '',
    accrualMethod: policy?.accrualMethod ?? 'UPFRONT',
    prorateOnJoining: policy?.prorateOnJoining ?? true,
    carryForwardMaxDays: policy?.carryForwardMaxDays ?? '',
    carryForwardExpiryMonths: policy?.carryForwardExpiryMonths ?? '',
    negativeBalanceLimit: policy?.negativeBalanceLimit ?? '',
    maxConsecutiveDays: policy?.maxConsecutiveDays ?? '',
    minNoticeDays: policy?.minNoticeDays ?? '',
    backdatingAllowedDays: policy?.backdatingAllowedDays ?? '',
    attachmentRequiredAfterDays: policy?.attachmentRequiredAfterDays ?? '',
    allowedDuringProbation: policy?.allowedDuringProbation ?? true,
    sandwichRule: policy?.sandwichRule ?? false,
    active: policy?.active ?? true,
    appliesTo: policy?.appliesTo ?? [],
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder padding="lg">
      <Title order={4}>{title}</Title>
      {description && (
        <Text size="sm" c="dimmed" mb="md">
          {description}
        </Text>
      )}
      <div style={{ marginTop: description ? 0 : 'var(--mantine-spacing-md)' }}>{children}</div>
    </Card>
  );
}

const EMPLOYMENT_TYPES = (Object.keys(EMPLOYMENT_TYPE) as EmploymentType[]).map((value) => ({
  value,
  label: EMPLOYMENT_TYPE[value],
}));
const GENDERS = (Object.keys(GENDER_LABEL) as Gender[]).map((value) => ({
  value,
  label: GENDER_LABEL[value],
}));

function RulesEditor({
  rules,
  onChange,
  readOnly,
}: {
  rules: PolicyRule[];
  onChange: (rules: PolicyRule[]) => void;
  readOnly: boolean;
}) {
  const departments = api.query.useQuery('get', '/api/v1/departments');
  const designations = api.query.useQuery('get', '/api/v1/designations');
  const locations = api.query.useQuery('get', '/api/v1/locations');
  const options = (items: { id?: string; name?: string }[] | undefined) =>
    (items ?? []).map((item) => ({ value: item.id!, label: item.name ?? '' }));
  const set = (index: number, change: Partial<PolicyRule>) =>
    onChange(rules.map((rule, at) => (at === index ? { ...rule, ...change } : rule)));

  return (
    <Stack>
      <QueriesError queries={[departments, designations, locations]} />
      {rules.length === 0 && (
        <Text size="sm" c="dimmed">
          No rules: the policy applies to everyone.
        </Text>
      )}
      {rules.map((rule, index) => (
        <Card key={index} withBorder padding="sm" bg="var(--mantine-color-default-hover)">
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>
              {index === 0 ? 'Employees in' : 'Or employees in'}
            </Text>
            {!readOnly && (
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Remove rule ${index + 1}`}
                onClick={() => onChange(rules.filter((_, at) => at !== index))}
              >
                <IconTrash size={16} />
              </ActionIcon>
            )}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            {(
              [
                ['departmentId', 'Department', options(departments.data)],
                ['designationId', 'Designation', options(designations.data)],
                ['locationId', 'Location', options(locations.data)],
                ['employmentType', 'Employment', EMPLOYMENT_TYPES],
                ['gender', 'Gender', GENDERS],
              ] as const
            ).map(([field, label, data]) => (
              <Select
                key={field}
                label={label}
                placeholder="Any"
                data={data}
                value={(rule[field] as string | undefined) ?? null}
                onChange={(value) => set(index, { [field]: value ?? undefined })}
                clearable
                searchable
                readOnly={readOnly}
              />
            ))}
          </SimpleGrid>
        </Card>
      ))}
      {!readOnly && (
        <Group>
          <Button
            variant="default"
            leftSection={<IconPlus size={16} />}
            onClick={() => onChange([...rules, {}])}
            disabled={rules.length >= 50}
          >
            Add rule
          </Button>
        </Group>
      )}
    </Stack>
  );
}

const half = { base: 12, sm: 6 };
const third = { base: 12, sm: 4 };

function PolicyEditor({ policy }: { policy?: LeavePolicy }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search] = useSearchParams();
  const { can } = useCurrentUser();
  const readOnly = !can(Permission.LEAVE_POLICY_MANAGE);
  const [formError, setFormError] = useState<string | null>(null);
  const leaveTypes = api.query.useQuery('get', '/api/v1/leave-types', {
    params: { query: { includeInactive: true } },
  });
  const form = useForm<PolicyForm>({
    initialValues: initialValues(policy, search.get('type')),
    validate: {
      leaveTypeId: (value) => (value ? null : 'Pick the leave type'),
      name: (value) => (value.trim() ? null : 'Enter a name'),
      entitlementDays: (value) => (typeof value === 'number' ? null : 'Enter the days a year (0 for none)'),
      effectiveTo: (value, values) =>
        value && values.effectiveFrom && value < values.effectiveFrom ? 'Must be after the start' : null,
    },
  });
  const create = api.query.useMutation('post', '/api/v1/leave-policies', { meta: { handlesError: true } });
  const update = api.query.useMutation('put', '/api/v1/leave-policies/{policyId}', {
    meta: { handlesError: true },
  });
  const selectedType = leaveTypes.data?.find((type) => type.id === form.values.leaveTypeId);

  function submit(values: PolicyForm) {
    setFormError(null);
    const body: LeavePolicyRequest = {
      leaveTypeId: values.leaveTypeId!,
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      effectiveFrom: values.effectiveFrom ?? undefined,
      effectiveTo: values.effectiveTo ?? undefined,
      entitlementDays: values.entitlementDays as number,
      accrualMethod: values.accrualMethod,
      prorateOnJoining: values.prorateOnJoining,
      carryForwardMaxDays: amount(values.carryForwardMaxDays),
      carryForwardExpiryMonths: amount(values.carryForwardExpiryMonths),
      negativeBalanceLimit: amount(values.negativeBalanceLimit),
      maxConsecutiveDays: amount(values.maxConsecutiveDays),
      minNoticeDays: amount(values.minNoticeDays),
      backdatingAllowedDays: amount(values.backdatingAllowedDays),
      attachmentRequiredAfterDays: amount(values.attachmentRequiredAfterDays),
      allowedDuringProbation: values.allowedDuringProbation,
      sandwichRule: values.sandwichRule,
      active: values.active,
      appliesTo: meaningfulRules(values.appliesTo),
    };
    const onError = (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors));
    const onSuccess = async () => {
      await invalidate(queryClient, '/api/v1/leave-policies', '/api/v1/leave-policies/{policyId}');
      showSuccess(policy ? 'Policy saved.' : 'Policy added.');
      navigate('/leave-setup/policies');
    };
    if (policy?.id) {
      update.mutate({ params: { path: { policyId: policy.id } }, body }, { onSuccess, onError });
    } else {
      create.mutate({ body }, { onSuccess, onError });
    }
  }

  const days = (field: keyof PolicyForm, label: string, description: string, decimals = false) => (
    <NumberInput
      label={label}
      description={description}
      min={0}
      step={decimals ? 0.5 : 1}
      decimalScale={decimals ? 1 : 0}
      allowDecimal={decimals}
      readOnly={readOnly}
      {...form.getInputProps(field)}
    />
  );

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="lg" maw={960}>
        <QueriesError queries={[leaveTypes]} />
        <FormError message={formError} />
        <Section title="Policy">
          <Grid gap="md">
            <Grid.Col span={half}>
              <Select
                label="Leave type"
                description={policy ? 'A policy’s leave type never changes.' : undefined}
                required
                data={(leaveTypes.data ?? []).map((type) => ({ value: type.id!, label: type.name ?? '' }))}
                disabled={Boolean(policy)}
                readOnly={readOnly}
                {...form.getInputProps('leaveTypeId')}
              />
            </Grid.Col>
            <Grid.Col span={half}>
              <TextInput
                label="Name"
                required
                maxLength={150}
                readOnly={readOnly}
                {...form.getInputProps('name')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Description"
                autosize
                minRows={2}
                maxLength={500}
                readOnly={readOnly}
                {...form.getInputProps('description')}
              />
            </Grid.Col>
            <Grid.Col span={half}>
              <DatePickerInput
                label="Effective from"
                placeholder="Always"
                clearable
                valueFormat="D MMM YYYY"
                readOnly={readOnly}
                {...form.getInputProps('effectiveFrom')}
              />
            </Grid.Col>
            <Grid.Col span={half}>
              <DatePickerInput
                label="Effective until"
                placeholder="No end"
                clearable
                valueFormat="D MMM YYYY"
                minDate={form.values.effectiveFrom ?? undefined}
                readOnly={readOnly}
                {...form.getInputProps('effectiveTo')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Switch
                label="Active"
                disabled={readOnly}
                {...form.getInputProps('active', { type: 'checkbox' })}
              />
            </Grid.Col>
          </Grid>
        </Section>

        <Section
          title="Entitlement"
          description={
            selectedType && !selectedType.balanceTracked
              ? `${selectedType.name} isn’t tracked against a balance, so the entitlement is not allocated.`
              : 'How many days a leave period gives, and how they are credited.'
          }
        >
          <Grid gap="md">
            <Grid.Col span={third}>
              <NumberInput
                label="Days a leave period"
                required
                min={0}
                step={0.5}
                decimalScale={1}
                readOnly={readOnly}
                {...form.getInputProps('entitlementDays')}
              />
            </Grid.Col>
            <Grid.Col span={third}>
              <Select
                label="Credited"
                required
                data={(Object.keys(ACCRUAL_LABEL) as Accrual[]).map((value) => ({
                  value,
                  label: ACCRUAL_LABEL[value],
                }))}
                readOnly={readOnly}
                {...form.getInputProps('accrualMethod')}
              />
            </Grid.Col>
            <Grid.Col span={third}>
              <Switch
                mt={{ base: 0, sm: 30 }}
                label="Prorate for joiners"
                disabled={readOnly}
                {...form.getInputProps('prorateOnJoining', { type: 'checkbox' })}
              />
            </Grid.Col>
            <Grid.Col span={third}>
              {days(
                'carryForwardMaxDays',
                'Carry forward up to',
                'Days into the next period; empty for none',
                true,
              )}
            </Grid.Col>
            <Grid.Col span={third}>
              {days(
                'carryForwardExpiryMonths',
                'Carried days expire after',
                'Months; empty: they don’t expire',
              )}
            </Grid.Col>
            <Grid.Col span={third}>
              {days('negativeBalanceLimit', 'Can go negative by', 'Days; empty or 0: never', true)}
            </Grid.Col>
          </Grid>
        </Section>

        <Section
          title="Rules for requests"
          description="Checked on every request; the employee sees each rule broken."
        >
          <Grid gap="md">
            <Grid.Col span={third}>
              {days('minNoticeDays', 'Notice', 'Days ahead to apply; empty: none')}
            </Grid.Col>
            <Grid.Col span={third}>
              {days(
                'backdatingAllowedDays',
                'Backdating',
                'Days a request may start in the past; empty: none',
              )}
            </Grid.Col>
            <Grid.Col span={third}>
              {days('maxConsecutiveDays', 'Longest request', 'Days in one request; empty: no limit')}
            </Grid.Col>
            <Grid.Col span={third}>
              {days('attachmentRequiredAfterDays', 'Document needed over', 'Days; empty: never', true)}
            </Grid.Col>
            <Grid.Col span={third}>
              <Switch
                mt={{ base: 0, sm: 30 }}
                label="Allowed during probation"
                disabled={readOnly}
                {...form.getInputProps('allowedDuringProbation', { type: 'checkbox' })}
              />
            </Grid.Col>
            <Grid.Col span={third}>
              <Switch
                mt={{ base: 0, sm: 30 }}
                label="Sandwich rule"
                description="Weekends and holidays between leave days count as leave."
                disabled={readOnly}
                {...form.getInputProps('sandwichRule', { type: 'checkbox' })}
              />
            </Grid.Col>
          </Grid>
        </Section>

        <Section
          title="Applies to"
          description="Employees matching any rule; within a rule, every field chosen must match. Two active policies of one leave type can’t cover the same people at the same time."
        >
          <RulesEditor
            rules={form.values.appliesTo}
            onChange={(rules) => form.setFieldValue('appliesTo', rules)}
            readOnly={readOnly}
          />
        </Section>

        {!readOnly && (
          <Group justify="flex-end">
            <Button variant="default" component={Link} to="/leave-setup/policies">
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {policy ? 'Save' : 'Add policy'}
            </Button>
          </Group>
        )}
      </Stack>
    </form>
  );
}

function BackLink() {
  return (
    <Anchor
      component={Link}
      to="/leave-setup/policies"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> Policies
    </Anchor>
  );
}

export function NewPolicyPage() {
  return (
    <>
      <BackLink />
      <PageHeader title="Add policy" />
      <PolicyEditor />
    </>
  );
}

export function PolicyPage() {
  const { policyId = '' } = useParams();
  const policy = api.query.useQuery('get', '/api/v1/leave-policies/{policyId}', {
    params: { path: { policyId } },
  });
  return (
    <>
      <BackLink />
      <PageHeader title={policy.data?.name ?? 'Policy'} />
      {policy.isError && <QueryError error={policy.error} onRetry={() => void policy.refetch()} />}
      {policy.isPending && <Skeleton h={480} maw={960} />}
      {policy.data && <PolicyEditor key={policy.data.updatedAt} policy={policy.data} />}
    </>
  );
}
