export type EnvConfig = {
  backendUrl: string;
  isDevelopment: boolean;
  clientVersion: string;
  recaptchaSiteKey: string;
  sentryDsn?: string;
};

declare module "virtual:env-config" {
  export const envConfig: EnvConfig;
}
