import { PageHeader } from '@lms/ui';
import { Tabs } from '@mantine/core';
import { IconBriefcase, IconBuilding, IconClockHour9, IconMapPin } from '@tabler/icons-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { DepartmentsTab } from './DepartmentsTab';
import { DesignationsTab } from './DesignationsTab';
import { LocationsTab } from './LocationsTab';
import { WorkSchedulesTab } from './WorkSchedulesTab';

const TABS = [
  { value: 'departments', label: 'Departments', icon: <IconBuilding size={16} />, Panel: DepartmentsTab },
  { value: 'designations', label: 'Designations', icon: <IconBriefcase size={16} />, Panel: DesignationsTab },
  { value: 'locations', label: 'Locations', icon: <IconMapPin size={16} />, Panel: LocationsTab },
  {
    value: 'work-schedules',
    label: 'Work schedules',
    icon: <IconClockHour9 size={16} />,
    Panel: WorkSchedulesTab,
  },
];

/** Departments, designations, locations and work schedules, one tab each (`/organisation/:tab`). */
export function OrganisationPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const current = TABS.find((candidate) => candidate.value === tab);
  if (!current) {
    return <Navigate to="/organisation/departments" replace />;
  }
  return (
    <>
      <PageHeader title="Organisation" description="How the organisation is structured." />
      <Tabs
        value={current.value}
        onChange={(value) => value && navigate(`/organisation/${value}`)}
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
