import { PageHeader } from '@lms/ui';
import { Tabs } from '@mantine/core';
import { IconCalendarStats, IconCategory, IconFileDescription } from '@tabler/icons-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { LeaveTypesTab } from './LeaveTypesTab';
import { PeriodsTab } from './PeriodsTab';
import { PoliciesTab } from './PoliciesTab';

const TABS = [
  { value: 'types', label: 'Leave types', icon: <IconCategory size={16} />, Panel: LeaveTypesTab },
  { value: 'policies', label: 'Policies', icon: <IconFileDescription size={16} />, Panel: PoliciesTab },
  { value: 'periods', label: 'Leave periods', icon: <IconCalendarStats size={16} />, Panel: PeriodsTab },
];

/** Leave types, policies and leave periods, one tab each (`/leave-setup/:tab`). */
export function LeaveSetupPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const current = TABS.find((candidate) => candidate.value === tab);
  if (!current) {
    return <Navigate to="/leave-setup/types" replace />;
  }
  return (
    <>
      <PageHeader
        title="Leave setup"
        description="What leave there is, who gets how much, and the leave years."
      />
      <Tabs
        value={current.value}
        onChange={(value) => value && navigate(`/leave-setup/${value}`)}
        keepMounted={false}
      >
        <Tabs.List mb="lg">
          {TABS.map(({ value, label, icon }) => (
            <Tabs.Tab key={value} value={value} leftSection={icon}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {TABS.map(({ value, Panel }) => (
          <Tabs.Panel key={value} value={value}>
            <Panel />
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}
