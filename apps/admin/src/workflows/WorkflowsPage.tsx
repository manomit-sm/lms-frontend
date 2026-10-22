import { ActiveBadge, EmptyState, PageHeader, QueryError } from '@lms/ui';
import { Badge, Button, Card, Group, Skeleton, Table, Text } from '@mantine/core';
import { IconArrowRight, IconPlus, IconRoute } from '@tabler/icons-react';
import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../runtime';
import { useWorkflowNames } from './useWorkflowNames';
import { describeHours, describeStep, describeWorkflowRule } from './workflowText';

/** Approval workflows in the order they are tried; the default catches whatever no other matches. */
export function WorkflowsPage() {
  const navigate = useNavigate();
  const workflows = api.query.useQuery('get', '/api/v1/approval-workflows');
  const rows = [...(workflows.data ?? [])].sort(
    (a, b) => Number(a.defaultWorkflow) - Number(b.defaultWorkflow) || (a.priority ?? 0) - (b.priority ?? 0),
  );
  const names = useWorkflowNames(rows);

  return (
    <>
      <PageHeader
        title="Approval workflows"
        description="A request goes to the first active workflow, by priority, with a rule it matches; the default workflow takes the rest. Changes apply to requests made afterwards."
        actions={
          <Button component={Link} to="/workflows/new" leftSection={<IconPlus size={16} />}>
            Add workflow
          </Button>
        }
      />
      {workflows.isError && <QueryError error={workflows.error} onRetry={() => void workflows.refetch()} />}
      {workflows.isPending && <Skeleton h={240} />}
      {workflows.data && (
        <Card withBorder padding={0}>
          {rows.length === 0 ? (
            <EmptyState icon={<IconRoute size={22} />} title="No workflows" />
          ) : (
            <Table.ScrollContainer minWidth={760}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Priority</Table.Th>
                    <Table.Th>Workflow</Table.Th>
                    <Table.Th>For</Table.Th>
                    <Table.Th>Approvers</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((workflow) => {
                    const timings = [
                      describeHours(workflow.reminderAfterHours) &&
                        `reminder after ${describeHours(workflow.reminderAfterHours)}`,
                      describeHours(workflow.escalateAfterHours) &&
                        `escalates after ${describeHours(workflow.escalateAfterHours)}`,
                      describeHours(workflow.autoApproveAfterHours) &&
                        `approved automatically after ${describeHours(workflow.autoApproveAfterHours)}`,
                    ].filter(Boolean);
                    return (
                      <Table.Tr
                        key={workflow.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/workflows/${workflow.id}`)}
                      >
                        <Table.Td>
                          {workflow.defaultWorkflow ? (
                            <Badge size="sm" variant="light">
                              Default
                            </Badge>
                          ) : (
                            workflow.priority
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {workflow.name}
                          </Text>
                          {timings.length > 0 && (
                            <Text size="xs" c="dimmed">
                              {timings.join(' · ')}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td maw={240}>
                          <Text size="sm">
                            {workflow.defaultWorkflow
                              ? 'Everything else'
                              : (workflow.rules ?? [])
                                  .map((rule) => describeWorkflowRule(rule, names.leaveType))
                                  .join('; or ') || 'Nothing (no rules)'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {(workflow.steps ?? []).length === 0 ? (
                            <Text size="sm" c="dimmed">
                              —
                            </Text>
                          ) : (
                            <Group gap={4}>
                              {(workflow.steps ?? []).map((step, index) => (
                                <Fragment key={index}>
                                  {index > 0 && (
                                    <IconArrowRight size={14} color="var(--mantine-color-dimmed)" />
                                  )}
                                  <Badge size="sm" variant="outline" color="gray" tt="none">
                                    {describeStep(step, names)}
                                  </Badge>
                                </Fragment>
                              ))}
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <ActiveBadge active={workflow.active} />
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
    </>
  );
}
