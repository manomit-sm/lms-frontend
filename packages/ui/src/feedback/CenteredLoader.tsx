import { Center, Loader } from '@mantine/core';

export function CenteredLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <Center h={fullScreen ? '100vh' : 240} aria-busy="true">
      <Loader aria-label="Loading" />
    </Center>
  );
}
