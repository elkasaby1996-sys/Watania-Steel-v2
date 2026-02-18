type RuntimeEnv = Record<string, string | undefined>;

const readRuntimeEnv = (): RuntimeEnv => {
  const maybeImportMetaEnv = (import.meta as ImportMeta & { env?: RuntimeEnv }).env;
  return maybeImportMetaEnv || {};
};

export const getEnvVar = (key: string): string | undefined => {
  const value = readRuntimeEnv()[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
