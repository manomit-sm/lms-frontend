import { ProfileCard, useCurrentUser } from '@lms/auth';
import { PageHeader } from '@lms/ui';

export function ProfilePage() {
  const user = useCurrentUser();
  return (
    <>
      <PageHeader title="Profile" description="Your account and employee record" />
      <ProfileCard user={user} />
    </>
  );
}
