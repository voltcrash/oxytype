import { z } from "zod";

import type { Api } from "../api/client";
import { ApiError, responseError, TransportError } from "../api/client";

const httpUrl = z
  .url()
  .refine((url) => ["https:", "http:"].includes(new URL(url).protocol));
const codeSchema = z.object({
  device_code: z.string().min(1),
  user_code: z.string().min(1),
  verification_uri: httpUrl,
  verification_uri_complete: httpUrl.optional(),
  expires_in: z.number().int().positive(),
  interval: z.number().int().positive(),
});
const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().refine((value) => value.toLowerCase() === "bearer"),
  expires_in: z.number().int().positive(),
});
const errorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});
export type DeviceCode = z.infer<typeof codeSchema>;
export type DeviceToken = z.infer<typeof tokenSchema>;
const clientId = "oxytype-tui";

export async function requestDeviceCode(
  api: Api,
  signal?: AbortSignal,
): Promise<DeviceCode> {
  const response = await api.auth(
    "/device/code",
    { client_id: clientId },
    signal,
    false,
  );
  if (response.status !== 200) throw responseError(response);
  return codeSchema.parse(response.body);
}

export async function pause(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = (): void => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function pollDeviceToken(
  api: Api,
  code: DeviceCode,
  signal: AbortSignal,
  options: { now?: () => number; wait?: typeof pause } = {},
): Promise<DeviceToken> {
  const now = options.now ?? Date.now;
  const wait = options.wait ?? pause;
  const deadline = now() + code.expires_in * 1000;
  let interval = code.interval * 1000;
  while (now() < deadline) {
    await wait(Math.min(interval, deadline - now()), signal);
    signal.throwIfAborted();
    if (now() >= deadline) break;
    try {
      const response = await api.auth(
        "/device/token",
        {
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: code.device_code,
          client_id: clientId,
        },
        signal,
        false,
      );
      if (response.status === 200) return tokenSchema.parse(response.body);
      const error = errorSchema.safeParse(response.body);
      if (error.success && error.data.error === "authorization_pending") {
        continue;
      }
      if (error.success && error.data.error === "slow_down") {
        interval += 5000;
        continue;
      }
      if (error.success && error.data.error === "access_denied") {
        throw new ApiError("Device login denied", response.status);
      }
      if (error.success && error.data.error === "expired_token") break;
      if (response.status === 429 || response.status >= 500) {
        interval = Math.min(interval * 2, 60_000);
        continue;
      }
      throw responseError(response);
    } catch (error) {
      if (!(error instanceof TransportError)) throw error;
      interval = Math.min(interval * 2, 60_000);
    }
  }
  throw new ApiError("Device code expired; start login again", 400);
}
