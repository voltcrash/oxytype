import { z } from "zod";

import { readJson } from "../storage/json";

const baseUrl = z.url().transform((value, ctx) => {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    ctx.addIssue({ code: "custom", message: "Expected an HTTP(S) base URL" });
    return z.NEVER;
  }
  return url.href.replace(/\/$/, "");
});

export const networkSettingsSchema = z.object({
  apiUrl: baseUrl.default("https://oxytype.voltcrash.com/api"),
  assetUrl: baseUrl.default("https://oxytype.voltcrash.com"),
  timeoutMs: z.number().int().min(100).max(120_000).default(10_000),
});
export type NetworkSettings = z.infer<typeof networkSettingsSchema>;

/** Native connection settings are separate from the synced web config. */
export async function openNetworkSettings(
  file: string,
  env: Record<string, string | undefined> = process.env,
): Promise<NetworkSettings> {
  const stored = await readJson(file, networkSettingsSchema.partial());
  if (stored.status === "invalid") throw new Error("Invalid network.json");
  const apiUrl = env["OXYTYPE_API_URL"];
  const assetUrl = env["OXYTYPE_ASSET_URL"];
  const timeout = env["OXYTYPE_TIMEOUT_MS"];
  return networkSettingsSchema.parse({
    ...(stored.status === "ok" ? stored.value : {}),
    ...(apiUrl !== undefined && apiUrl !== "" ? { apiUrl } : {}),
    ...(assetUrl !== undefined && assetUrl !== "" ? { assetUrl } : {}),
    ...(timeout !== undefined && timeout !== ""
      ? { timeoutMs: Number(timeout) }
      : {}),
  });
}
