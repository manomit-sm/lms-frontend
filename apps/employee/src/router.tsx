import { CurrentUserProvider, LocalTenantSignIn, RequireSession, SIGN_IN_PATH } from '@lms/auth';
import { NotFoundPage, RouteErrorPage } from '@lms/ui';
import { createBrowserRouter } from 'react-router';
import { EmployeeShell } from './EmployeeShell';
import { RequireEmployeeOutlet } from './leave/RequireEmployee';
import { DashboardPage } from './pages/DashboardPage';
import { api, localAuthApi } from './runtime';

// Pages other than the dashboard load on first visit, so the first screen ships less code
export const router = createBrowserRouter([
  {
    path: SIGN_IN_PATH,
    element: <LocalTenantSignIn localApi={localAuthApi} portalName="employee portal" />,
    errorElement: <RouteErrorPage fullScreen />,
  },
  {
    path: '/',
    element: (
      <RequireSession>
        <CurrentUserProvider api={api}>
          <EmployeeShell />
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
            path: 'profile',
            lazy: async () => ({ Component: (await import('./pages/ProfilePage')).ProfilePage }),
          },
          {
            path: 'notifications',
            lazy: async () => ({
              Component: (await import('./notifications/NotificationsPage')).NotificationsPage,
            }),
          },
          // Approvers need not be employees (e.g. an HR role), so these sit outside the employee check
          {
            path: 'approvals',
            lazy: async () => ({ Component: (await import('./approvals/ApprovalsPage')).ApprovalsPage }),
          },
          {
            path: 'approvals/:requestId',
            lazy: async () => ({
              Component: (await import('./approvals/ReviewRequestPage')).ReviewRequestPage,
            }),
          },
          {
            element: <RequireEmployeeOutlet />,
            children: [
              {
                path: 'leave',
                lazy: async () => ({ Component: (await import('./pages/MyRequestsPage')).MyRequestsPage }),
              },
              {
                path: 'leave/apply',
                lazy: async () => ({ Component: (await import('./pages/ApplyLeavePage')).ApplyLeavePage }),
              },
              {
                path: 'leave/:requestId',
                lazy: async () => ({
                  Component: (await import('./pages/RequestDetailPage')).RequestDetailPage,
                }),
              },
              {
                path: 'balances',
                lazy: async () => ({ Component: (await import('./pages/BalancesPage')).BalancesPage }),
              },
              {
                path: 'calendar',
                lazy: async () => ({ Component: (await import('./calendar/CalendarPage')).CalendarPage }),
              },
              {
                path: 'team',
                lazy: async () => ({ Component: (await import('./team/TeamPage')).TeamPage }),
              },
              {
                path: 'team/:employeeId',
                lazy: async () => ({ Component: (await import('./team/TeamMemberPage')).TeamMemberPage }),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
