import { chmod } from "node:fs/promises";
import { z } from "zod";

import { readJson, removeFile, writeJson } from "../storage/json";

const credentialSchema = z.object({
  apiUrl: z.string(),
  accessToken: z.string().min(1),
  expiresAt: z.number().positive(),
  user: z.object({ uid: z.string().min(1), name: z.string() }),
});
export type Credential = z.infer<typeof credentialSchema>;
export type Credentials = {
  get: () => Credential | undefined;
  set: (value: Credential | undefined) => Promise<void>;
  flush: () => Promise<void>;
};

export async function openCredentials(
  file: string,
  apiUrl: string,
): Promise<Credentials> {
  const stored = await readJson(file, credentialSchema);
  if (stored.status === "ok") await chmod(file, 0o600);
  let current =
    stored.status === "ok" && stored.value.apiUrl === apiUrl
      ? stored.value
      : undefined;
  if (stored.status === "invalid") await removeFile(file);
  let pending = Promise.resolve();
  return {
    get: () => current,
    set: async (value) => {
      current = value;
      const write = async (): Promise<void> => {
        if (value === undefined) await removeFile(file);
        else await writeJson(file, value, { mode: 0o600 });
      };
      pending = pending.then(write, write);
      await pending;
    },
    flush: async () => pending,
  };
}
