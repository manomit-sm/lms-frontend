/**
 * A required build-time setting (`VITE_*`, from `.env.development` locally or the build environment).
 * There are no defaults: a missing setting stops the portal at startup with a clear message.
 * Defined but empty is allowed (e.g. an empty API base URL means "same origin").
 */
export function requireEnv(name: `VITE_${string}`): string {
  const value = (import.meta.env as Record<string, unknown>)[name];
  if (typeof value !== 'string') {
    throw new Error(`Missing setting ${name}: define it in .env.development or the build environment`);
  }
  return value;
}
