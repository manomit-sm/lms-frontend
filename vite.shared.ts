import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type UserConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

/** Backend paths the dev server forwards, so the browser only ever talks to the portal's own origin. */
const BACKEND_PATHS = ['/api', '/platform', '/local'];

/**
 * The Vite config every portal shares. Settings come from the repo-root `.env.*` files or the
 * environment; a build stops when one of the portal's required `VITE_*` settings is missing.
 */
export function portalConfig({ port, requiredEnv }: { port: number; requiredEnv: readonly string[] }) {
  return defineConfig(({ command, mode }): UserConfig => {
    const env = loadEnv(mode, repoRoot, '');
    const missing = requiredEnv.filter((name) => env[name] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing settings for this ${mode} ${command}: ${missing.join(', ')}`);
    }
    const backend = env.LMS_BACKEND_URL;
    if (command === 'serve' && !backend) {
      throw new Error('LMS_BACKEND_URL is not set: the dev server proxies the API to it (.env.development)');
    }
    return {
      plugins: [react()],
      envDir: repoRoot,
      server: {
        port,
        strictPort: true,
        proxy: backend ? Object.fromEntries(BACKEND_PATHS.map((path) => [path, { target: backend }])) : {},
      },
      preview: { port, strictPort: true },
      // React + Mantine + router + query is ~200 kB gzipped; pages are lazy-loaded as they are added.
      build: { sourcemap: true, chunkSizeWarningLimit: 800 },
    };
  });
}
