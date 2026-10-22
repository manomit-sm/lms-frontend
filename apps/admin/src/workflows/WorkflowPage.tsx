import { applyFieldErrors, FormError, PageHeader, QueryError, showSuccess } from '@lms/ui';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Select,
  Skeleton,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconInfoCircle,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EmployeeSelect } from '../employees/EmployeeSelect';
import { invalidate } from '../refresh';
import { api } from '../runtime';
import type { Workflow, WorkflowRequest, WorkflowRule, WorkflowStep } from '../types';
import { useWorkflowNames } from './useWorkflowNames';
import { APPROVER_TYPE, type ApproverType } from './workflowText';

const MAX_STEPS = 5;

type Hours = number | string;
const hours = (value: Hours) => (typeof value === 'number' ? value : undefined);

interface WorkflowForm {
  name: string;
  description: string;
  priority: number | string;
  active: boolean;
  rules: WorkflowRule[];
  steps: WorkflowStep[];
  reminderAfterHours: Hours;
  escalateAfterHours: Hours;
  autoApproveAfterHours: Hours;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder padding="lg">
      <Title order={4}>{title}</Title>
      <Text size="sm" c="dimmed" mb="md">
        {description}
      </Text>
      {children}
    </Card>
  );
}

function WorkflowEditor({ workflow, nextPriority }: { workflow?: Workflow; nextPriority: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const names = useWorkflowNames(workflow ? [workflow] : []);
  const isDefault = Boolean(workflow?.defaultWorkflow);
  const form = useForm<WorkflowForm>({
    initialValues: {
      name: workflow?.name ?? '',
      description: workflow?.description ?? '',
      priority: workflow?.priority ?? nextPriority,
      active: workflow?.active ?? true,
      rules: workflow?.rules ?? (isDefault ? [] : [{}]),
      steps: workflow?.steps ?? [{ approverType: 'REPORTING_MANAGER' }],
      reminderAfterHours: workflow?.reminderAfterHours ?? '',
      escalateAfterHours: workflow?.escalateAfterHours ?? '',
      autoApproveAfterHours: workflow?.autoApproveAfterHours ?? '',
    },
    validate: {
      name: (value) => (value.trim() ? null : 'Enter a name'),
      priority: (value) => (typeof value === 'number' ? null : 'Enter a priority'),
      rules: (value) => (isDefault || value.length > 0 ? null : 'Add a rule, or the workflow never applies'),
      steps: (value) =>
        value.length === 0
          ? 'Add at least one step'
          : value.some(
                (step) =>
                  (step.approverType === 'ROLE' && !step.roleCode) ||
                  (step.approverType === 'EMPLOYEE' && !step.employeeId),
              )
            ? 'Pick the role or employee of every step'
            : null,
    },
  });
  const create = api.query.useMutation('post', '/api/v1/approval-workflows', {
    meta: { handlesError: true },
  });
  const update = api.query.useMutation('put', '/api/v1/approval-workflows/{workflowId}', {
    meta: { handlesError: true },
  });

  const setRule = (index: number, change: Partial<WorkflowRule>) =>
    form.setFieldValue(
      'rules',
      form.values.rules.map((rule, at) => (at === index ? { ...rule, ...change } : rule)),
    );
  const setStep = (index: number, step: WorkflowStep) =>
    form.setFieldValue(
      'steps',
      form.values.steps.map((current, at) => (at === index ? step : current)),
    );
  const moveStep = (index: number, by: number) => {
    const steps = [...form.values.steps];
    const [step] = steps.splice(index, 1);
    steps.splice(index + by, 0, step!);
    form.setFieldValue('steps', steps);
  };

  function submit(values: WorkflowForm) {
    setFormError(null);
    const body: WorkflowRequest = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      priority: values.priority as number,
      active: values.active,
      rules: isDefault
        ? []
        : values.rules.map((rule) => ({
            leaveTypeId: rule.leaveTypeId || undefined,
            minDays: rule.minDays || undefined,
          })),
      steps: values.steps.map((step) => ({
        approverType: step.approverType,
        roleCode: step.approverType === 'ROLE' ? step.roleCode : undefined,
        employeeId: step.approverType === 'EMPLOYEE' ? step.employeeId : undefined,
      })),
      reminderAfterHours: hours(values.reminderAfterHours),
      escalateAfterHours: hours(values.escalateAfterHours),
      autoApproveAfterHours: hours(values.autoApproveAfterHours),
    };
    const onError = (error: unknown) => setFormError(applyFieldErrors(error, form.setErrors));
    const onSuccess = async () => {
      await invalidate(queryClient, '/api/v1/approval-workflows', '/api/v1/approval-workflows/{workflowId}');
      showSuccess(workflow ? 'Workflow saved.' : 'Workflow added.');
      navigate('/workflows');
    };
    if (workflow?.id) {
      update.mutate({ params: { path: { workflowId: workflow.id } }, body }, { onSuccess, onError });
    } else {
      create.mutate({ body }, { onSuccess, onError });
    }
  }

  const leaveTypeOptions = names.leaveTypes.map((type) => ({ value: type.id!, label: type.name ?? '' }));
  const roleOptions = names.roles.map((role) => ({ value: role.code!, label: role.name ?? role.code! }));

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="lg" maw={880}>
        {isDefault && (
          <Alert icon={<IconInfoCircle size={18} />} color="blue">
            The default workflow handles every request no other workflow matches, so it has no rules and stays
            active. Its approvers and timings can change.
          </Alert>
        )}
        <FormError message={formError} />
        <Card withBorder padding="lg">
          <Grid gap="md">
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <TextInput label="Name" required maxLength={150} {...form.getInputProps('name')} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Priority"
                description="Lower is tried first; each is unique."
                required
                allowDecimal={false}
                {...form.getInputProps('priority')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Description"
                autosize
                minRows={2}
                maxLength={500}
                {...form.getInputProps('description')}
              />
            </Grid.Col>
            {!isDefault && (
              <Grid.Col span={12}>
                <Switch label="Active" {...form.getInputProps('active', { type: 'checkbox' })} />
              </Grid.Col>
            )}
          </Grid>
        </Card>

        {!isDefault && (
          <Section
            title="Used for"
            description="Requests matching any of these rules. Empty fields match anything."
          >
            <Stack>
              {form.values.rules.map((rule, index) => (
                <Group key={index} align="flex-end" wrap="nowrap">
                  <Select
                    label={index === 0 ? 'Leave type' : undefined}
                    placeholder="Any leave type"
                    data={leaveTypeOptions}
                    value={rule.leaveTypeId ?? null}
                    onChange={(value) => setRule(index, { leaveTypeId: value ?? undefined })}
                    clearable
                    style={{ flex: 1 }}
                  />
                  <NumberInput
                    label={index === 0 ? 'At least (days)' : undefined}
                    placeholder="Any length"
                    min={0.5}
                    step={0.5}
                    decimalScale={1}
                    value={rule.minDays ?? ''}
                    onChange={(value) =>
                      setRule(index, { minDays: typeof value === 'number' ? value : undefined })
                    }
                    w={160}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="lg"
                    mb={2}
                    aria-label={`Remove rule ${index + 1}`}
                    onClick={() =>
                      form.setFieldValue(
                        'rules',
                        form.values.rules.filter((_, at) => at !== index),
                      )
                    }
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
              {form.errors.rules && (
                <Text size="sm" c="red">
                  {form.errors.rules}
                </Text>
              )}
              <Group>
                <Button
                  variant="default"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => form.setFieldValue('rules', [...form.values.rules, {}])}
                  disabled={form.values.rules.length >= 20}
                >
                  Add rule
                </Button>
              </Group>
            </Stack>
          </Section>
        )}

        <Section
          title="Approvers"
          description="In order; each step must approve before the next is asked. A step whose approver can’t be found (e.g. no manager) is skipped."
        >
          <Stack>
            {form.values.steps.map((step, index) => (
              <Card key={index} withBorder padding="sm" bg="var(--mantine-color-default-hover)">
                <Group align="flex-start" wrap="nowrap" gap="sm">
                  <Badge circle size="lg" mt={4}>
                    {index + 1}
                  </Badge>
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Select
                      aria-label={`Approver of step ${index + 1}`}
                      data={(Object.keys(APPROVER_TYPE) as ApproverType[]).map((value) => ({
                        value,
                        label: APPROVER_TYPE[value],
                      }))}
                      value={step.approverType ?? null}
                      onChange={(value) => value && setStep(index, { approverType: value as ApproverType })}
                      allowDeselect={false}
                    />
                    {step.approverType === 'ROLE' && (
                      <Select
                        aria-label={`Role of step ${index + 1}`}
                        placeholder="Pick a role"
                        description="Any one user with the role can decide."
                        data={roleOptions}
                        value={step.roleCode ?? null}
                        onChange={(value) => setStep(index, { ...step, roleCode: value ?? undefined })}
                      />
                    )}
                    {step.approverType === 'EMPLOYEE' && (
                      <EmployeeSelect
                        label=""
                        value={step.employeeId ?? null}
                        selected={
                          step.employeeId && names.employee(step.employeeId)
                            ? { id: step.employeeId, name: names.employee(step.employeeId)! }
                            : null
                        }
                        onChange={(value) => setStep(index, { ...step, employeeId: value ?? undefined })}
                      />
                    )}
                  </Stack>
                  <Group gap={2} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      aria-label={`Move step ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => moveStep(index, -1)}
                    >
                      <IconArrowUp size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      aria-label={`Move step ${index + 1} down`}
                      disabled={index === form.values.steps.length - 1}
                      onClick={() => moveStep(index, 1)}
                    >
                      <IconArrowDown size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Remove step ${index + 1}`}
                      disabled={form.values.steps.length === 1}
                      onClick={() =>
                        form.setFieldValue(
                          'steps',
                          form.values.steps.filter((_, at) => at !== index),
                        )
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))}
            {form.errors.steps && (
              <Text size="sm" c="red">
                {form.errors.steps}
              </Text>
            )}
            <Group>
              <Button
                variant="default"
                leftSection={<IconPlus size={16} />}
                onClick={() =>
                  form.setFieldValue('steps', [...form.values.steps, { approverType: 'REPORTING_MANAGER' }])
                }
                disabled={form.values.steps.length >= MAX_STEPS}
              >
                Add step
              </Button>
              {form.values.steps.length >= MAX_STEPS && (
                <Text size="sm" c="dimmed">
                  At most {MAX_STEPS} steps.
                </Text>
              )}
            </Group>
          </Stack>
        </Section>

        <Section
          title="When nobody decides"
          description="Hours a step may wait, up to 720 (30 days). Empty: never."
        >
          <Grid gap="md">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Remind after"
                description="The approvers get a reminder."
                min={1}
                max={720}
                allowDecimal={false}
                suffix=" h"
                {...form.getInputProps('reminderAfterHours')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Escalate after"
                description="Their managers (or else HR admins) can decide too."
                min={1}
                max={720}
                allowDecimal={false}
                suffix=" h"
                {...form.getInputProps('escalateAfterHours')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <NumberInput
                label="Approve automatically after"
                description="The step counts as approved."
                min={1}
                max={720}
                allowDecimal={false}
                suffix=" h"
                {...form.getInputProps('autoApproveAfterHours')}
              />
            </Grid.Col>
          </Grid>
        </Section>

        <Group justify="flex-end">
          <Button variant="default" component={Link} to="/workflows">
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            {workflow ? 'Save' : 'Add workflow'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function BackLink() {
  return (
    <Anchor
      component={Link}
      to="/workflows"
      size="sm"
      mb="sm"
      display="inline-flex"
      style={{ alignItems: 'center', gap: 4 }}
    >
      <IconArrowLeft size={14} /> Approval workflows
    </Anchor>
  );
}

export function NewWorkflowPage() {
  const workflows = api.query.useQuery('get', '/api/v1/approval-workflows');
  const nextPriority =
    Math.max(0, ...(workflows.data ?? []).filter((w) => !w.defaultWorkflow).map((w) => w.priority ?? 0)) + 10;
  return (
    <>
      <BackLink />
      <PageHeader title="Add workflow" />
      {workflows.isPending ? <Skeleton h={480} maw={880} /> : <WorkflowEditor nextPriority={nextPriority} />}
    </>
  );
}

export function WorkflowPage() {
  const { workflowId = '' } = useParams();
  const workflow = api.query.useQuery('get', '/api/v1/approval-workflows/{workflowId}', {
    params: { path: { workflowId } },
  });
  return (
    <>
      <BackLink />
      <PageHeader title={workflow.data?.name ?? 'Workflow'} />
      {workflow.isError && <QueryError error={workflow.error} onRetry={() => void workflow.refetch()} />}
      {workflow.isPending && <Skeleton h={480} maw={880} />}
      {workflow.data && (
        <WorkflowEditor key={workflow.data.updatedAt} workflow={workflow.data} nextPriority={0} />
      )}
    </>
  );
}
