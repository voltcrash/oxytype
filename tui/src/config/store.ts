import type { Config } from "@oxytype/schemas/configs";
import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import {
  migrateConfig,
  supportedConfigSchema,
} from "@oxytype/typing-core/config/migrate";
import { isDeepStrictEqual } from "node:util";
import { createContext, useContext } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import type { Schema } from "../storage/json";
import { readJson, writeJson } from "../storage/json";

type ConfigLoadStatus =
  /** Stored config matched the current schema. */
  | "ok"
  /** No file yet; defaults were written. */
  | "created"
  /** Legacy or invalid values were migrated, dropped or defaulted. */
  | "repaired"
  /** The file was unreadable JSON; defaults replaced it. */
  | "reset";

export type ConfigStore = {
  config: Readonly<Config>;
  status: ConfigLoadStatus;
  /** Returns false and keeps the current value when validation fails. */
  set: <K extends keyof Config>(key: K, value: Config[K]) => boolean;
  reset: () => void;
  /** Resolves once queued writes reach disk. */
  flush: () => Promise<void>;
};

const objectSchema: Schema<object> = {
  safeParse: (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? { success: true, data: value }
      : { success: false, error: new Error("Config must be a JSON object") },
};

const settingSchema = supportedConfigSchema.partial();

export async function openConfigStore(file: string): Promise<ConfigStore> {
  const stored = await readJson(file, objectSchema);
  const initial =
    stored.status === "ok"
      ? migrateConfig(structuredClone(stored.value))
      : getDefaultConfig();
  const status: ConfigLoadStatus =
    stored.status === "missing"
      ? "created"
      : stored.status === "invalid"
        ? "reset"
        : isDeepStrictEqual(initial, stored.value)
          ? "ok"
          : "repaired";

  const [config, setConfig] = createStore<Config>(initial);
  let pending = Promise.resolve();
  const save = (): void => {
    const snapshot = structuredClone(unwrap(config));
    // Serialize writes so an older snapshot can never land last.
    pending = pending.then(async () => writeJson(file, snapshot));
  };

  if (status !== "ok") save();

  return {
    config,
    status,
    set: (key, value) => {
      const parsed = settingSchema.safeParse({ [key]: value });
      // Unsupported settings, e.g. removed web features, are stripped.
      if (!parsed.success || !(key in parsed.data)) return false;
      const next = (parsed.data as Partial<Config>)[key] as Config[typeof key];
      if (isDeepStrictEqual(config[key], next)) return true;
      setConfig(key, reconcile(next));
      save();
      return true;
    },
    reset: () => {
      setConfig(reconcile(getDefaultConfig()));
      save();
    },
    flush: async () => pending,
  };
}

export const ConfigContext = createContext<ConfigStore>();

export function useConfig(): ConfigStore {
  const store = useContext(ConfigContext);
  if (store === undefined) throw new Error("useConfig outside ConfigContext");
  return store;
}
