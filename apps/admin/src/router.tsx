import { CurrentUserProvider, LocalTenantSignIn, RequireSession, SIGN_IN_PATH } from '@lms/auth';
import { NotFoundPage, RouteErrorPage } from '@lms/ui';
import { createBrowserRouter } from 'react-router';
import { AdminShell } from './AdminShell';
import { AREA_PERMISSIONS } from './navigation';
import { DashboardPage } from './insight/DashboardPage';
import { RequirePermission } from './RequirePermission';
import { api, localAuthApi } from './runtime';

export const router = createBrowserRouter([
  {
    path: SIGN_IN_PATH,
    element: <LocalTenantSignIn localApi={localAuthApi} portalName="admin portal" />,
    errorElement: <RouteErrorPage fullScreen />,
  },
  {
    path: '/',
    element: (
      <RequireSession>
        <CurrentUserProvider api={api}>
          <AdminShell />
        </CurrentUserProvider>
      </RequireSession>
    ),
    errorElement: <RouteErrorPage fullScreen />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.employees} />,
            children: [
              {
                path: 'employees',
                lazy: async () => ({ Component: (await import('./employees/EmployeesPage')).EmployeesPage }),
              },
              {
                path: 'employees/new',
                lazy: async () => ({
                  Component: (await import('./employees/EmployeeFormPage')).NewEmployeePage,
                }),
              },
              {
                path: 'employees/:employeeId',
                lazy: async () => ({ Component: (await import('./employees/EmployeePage')).EmployeePage }),
              },
              {
                path: 'employees/:employeeId/edit',
                lazy: async () => ({
                  Component: (await import('./employees/EmployeeFormPage')).EditEmployeePage,
                }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.organisation} />,
            children: [
              {
                path: 'organisation/:tab?',
                lazy: async () => ({
                  Component: (await import('./organisation/OrganisationPage')).OrganisationPage,
                }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.users} />,
            children: [
              {
                path: 'users',
                lazy: async () => ({ Component: (await import('./access/UsersPage')).UsersPage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.roles} />,
            children: [
              {
                path: 'roles',
                lazy: async () => ({ Component: (await import('./access/RolesPage')).RolesPage }),
              },
              {
                path: 'roles/new',
                lazy: async () => ({ Component: (await import('./access/RolePage')).NewRolePage }),
              },
              {
                path: 'roles/:roleId',
                lazy: async () => ({ Component: (await import('./access/RolePage')).RolePage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.leaveSetup} />,
            children: [
              {
                path: 'leave-setup/policies/new',
                lazy: async () => ({ Component: (await import('./leavesetup/PolicyPage')).NewPolicyPage }),
              },
              {
                path: 'leave-setup/policies/:policyId',
                lazy: async () => ({ Component: (await import('./leavesetup/PolicyPage')).PolicyPage }),
              },
              {
                path: 'leave-setup/:tab?',
                lazy: async () => ({
                  Component: (await import('./leavesetup/LeaveSetupPage')).LeaveSetupPage,
                }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.holidays} />,
            children: [
              {
                path: 'holidays',
                lazy: async () => ({ Component: (await import('./holidays/HolidaysPage')).HolidaysPage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.workflows} />,
            children: [
              {
                path: 'workflows',
                lazy: async () => ({ Component: (await import('./workflows/WorkflowsPage')).WorkflowsPage }),
              },
              {
                path: 'workflows/new',
                lazy: async () => ({ Component: (await import('./workflows/WorkflowPage')).NewWorkflowPage }),
              },
              {
                path: 'workflows/:workflowId',
                lazy: async () => ({ Component: (await import('./workflows/WorkflowPage')).WorkflowPage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.balances} />,
            children: [
              {
                path: 'balances',
                lazy: async () => ({ Component: (await import('./balances/BalancesPage')).BalancesPage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.reports} />,
            children: [
              {
                path: 'reports/:tab?',
                lazy: async () => ({ Component: (await import('./insight/ReportsPage')).ReportsPage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.audit} />,
            children: [
              {
                path: 'audit',
                lazy: async () => ({ Component: (await import('./insight/AuditPage')).AuditPage }),
              },
            ],
          },
          {
            element: <RequirePermission anyOf={AREA_PERMISSIONS.settings} />,
            children: [
              {
                path: 'settings',
                lazy: async () => ({ Component: (await import('./settings/SettingsPage')).SettingsPage }),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
