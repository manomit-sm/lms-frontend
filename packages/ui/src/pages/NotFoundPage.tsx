import { Button } from '@mantine/core';
import { IconMapOff } from '@tabler/icons-react';
import { Link } from 'react-router';
import { MessagePage } from './MessagePage';

export function NotFoundPage() {
  return (
    <MessagePage
      icon={<IconMapOff size={28} />}
      title="Page not found"
      description="The page you asked for doesn't exist, or it has moved."
      actions={
        <Button component={Link} to="/">
          Go to the home page
        </Button>
      }
    />
  );
}
