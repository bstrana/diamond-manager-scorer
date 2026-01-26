export const getEnvVar = (key: string): string | undefined => {
  const keysToCheck = [key];
  if (!key.startsWith('VITE_')) {
    keysToCheck.push(`VITE_${key}`);
  }

  const runtimeEnv = (typeof window !== 'undefined' && (window as any).__ENV__)
    ? (window as any).__ENV__
    : undefined;
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

  for (const envKey of keysToCheck) {
    if (runtimeEnv && runtimeEnv[envKey] !== undefined && runtimeEnv[envKey] !== '') {
      return runtimeEnv[envKey];
    }
    if (typeof process !== 'undefined' && process.env && process.env[envKey] !== undefined && process.env[envKey] !== '') {
      return process.env[envKey];
    }
    if (metaEnv && metaEnv[envKey] !== undefined && metaEnv[envKey] !== '') {
      return metaEnv[envKey];
    }
  }

  return undefined;
};
