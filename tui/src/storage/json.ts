import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { tryCatch, tryCatchSync } from "@oxytype/util/trycatch";

/** Structural zod v3/v4 schema shape. */
export type Schema<T> = {
  safeParse: (
    value: unknown,
  ) => { success: true; data: T } | { success: false; error: unknown };
};

export type ReadResult<T> =
  | { status: "ok"; value: T }
  | { status: "missing" }
  | { status: "invalid"; error: unknown };

export async function readJson<T>(
  file: string,
  schema: Schema<T>,
): Promise<ReadResult<T>> {
  const read = await tryCatch(readFile(file, "utf8"));
  if (read.error !== null) {
    if (isMissing(read.error)) return { status: "missing" };
    throw read.error;
  }

  const json = tryCatchSync(() => JSON.parse(read.data) as unknown);
  if (json.error !== null) return { status: "invalid", error: json.error };

  const parsed = schema.safeParse(json.data);
  return parsed.success
    ? { status: "ok", value: parsed.data }
    : { status: "invalid", error: parsed.error };
}

export type WriteOptions = {
  /** File mode, e.g. `0o600` for credentials. Directories are user-only. */
  mode?: number;
};

/** Writes through a temporary file so readers never see partial JSON. */
export async function writeJson(
  file: string,
  value: unknown,
  options: WriteOptions = {},
): Promise<void> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      mode: options.mode ?? 0o644,
    });
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function removeFile(file: string): Promise<void> {
  await rm(file, { force: true });
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
