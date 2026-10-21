import { errorMessage, isApiError } from '@lms/api';
import { Button } from '@mantine/core';
import { IconBug } from '@tabler/icons-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { MessagePage } from './MessagePage';
import { NotFoundPage } from './NotFoundPage';

/**
 * Router `errorElement`: anything a page throws while rendering ends up here - inside the portal shell
 * for pages, full screen when the shell itself failed.
 */
export function RouteErrorPage({ fullScreen = false }: { fullScreen?: boolean }) {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }
  return (
    <MessagePage
      fullScreen={fullScreen}
      icon={<IconBug size={28} />}
      title="Something went wrong"
      description={
        isApiError(error) ? errorMessage(error) : 'This page failed to load. Reloading usually helps.'
      }
      actions={<Button onClick={() => window.location.reload()}>Reload</Button>}
    />
  );
}
