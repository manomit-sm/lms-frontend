import { SessionProvider } from '@lms/auth';
import { AppProviders } from '@lms/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { queryClient, sessionStore } from './runtime';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <SessionProvider store={sessionStore}>
        <RouterProvider router={router} />
      </SessionProvider>
    </AppProviders>
  </StrictMode>,
);
