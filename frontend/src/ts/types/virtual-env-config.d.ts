export type EnvConfig = {
  backendUrl: string;
  isDevelopment: boolean;
  clientVersion: string;
  turnstileSiteKey: string;
  sentryDsn?: string;
};

declare module "virtual:env-config" {
  export const envConfig: EnvConfig;
}
