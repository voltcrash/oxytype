import { envValue } from "./runtime/env";
export function getVersion(): string {
  return envValue("VERSION") ?? "DEVELOPMENT-VERSION";
}
export const version = "WORKER";
