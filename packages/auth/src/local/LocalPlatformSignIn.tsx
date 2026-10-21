import { errorMessage, type LocalAuthApi } from '@lms/api';
import { Alert, Button, TextInput } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { returnPath } from '../session/paths';
import { useSession } from '../session/useSession';
import { SignInLayout } from './SignInLayout';

const TOKEN_TTL_MINUTES = 480;

/** Local-profile sign-in for the platform portal: a platform-admin token for any subject. */
export function LocalPlatformSignIn({ localApi }: { localApi: LocalAuthApi }) {
  const { session, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [subject, setSubject] = useState('platform-admin');

  const signInAs = useMutation({
    mutationFn: (name: string) => localApi.platformToken(name, TOKEN_TTL_MINUTES),
    onSuccess: (token, name) => {
      signIn({ accessToken: token.accessToken, expiresAt: Date.now() + token.expiresIn * 1000, label: name });
      navigate(returnPath(location.search), { replace: true });
    },
    meta: { handlesError: true },
  });

  if (session) {
    return <Navigate to={returnPath(location.search)} replace />;
  }

  return (
    <SignInLayout portalName="platform portal">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          signInAs.mutate(subject.trim());
        }}
      >
        <TextInput
          label="Platform admin"
          description="Any name: it becomes the token subject and appears in the backend's logs."
          value={subject}
          onChange={(event) => setSubject(event.currentTarget.value)}
          required
          mb="md"
        />
        {signInAs.isError && (
          <Alert color="red" mb="md">
            {errorMessage(signInAs.error)}
          </Alert>
        )}
        <Button type="submit" fullWidth loading={signInAs.isPending} disabled={!subject.trim()}>
          Sign in
        </Button>
      </form>
    </SignInLayout>
  );
}
