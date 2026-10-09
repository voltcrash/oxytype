import type { Config, PartialConfig } from "@oxytype/schemas/configs";
import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import {
  migrateConfig,
  supportedConfigSchema,
} from "@oxytype/typing-core/config/migrate";
import {
  resolveConfigChange,
  resolveFullConfig,
  type ConfigChangeFailure,
} from "@oxytype/typing-core/config/setter";
import { isDeepStrictEqual } from "node:util";
import {
  batch,
  createContext,
  createSignal,
  useContext,
  type Accessor,
} from "solid-js";
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
  remoteRevision: Accessor<number>;
  status: ConfigLoadStatus;
  /**
   * Applies the web's setting rules, including dependent settings. Returns
   * false and keeps the current values when a rule rejects the change.
   */
  set: <K extends keyof Config>(key: K, value: Config[K]) => boolean;
  /** Rejected changes, e.g. to show the reason. */
  onReject: (listener: (failure: ConfigChangeFailure) => void) => () => void;
  /** Lets no_quit tests block settings that would restart them. */
  setTestActive: (active: () => boolean) => void;
  reset: () => void;
  /** Applies a partial or full config onto the defaults, like a web import. */
  apply: (config: object) => void;
  /** Server wins; applying a remote snapshot never emits a local edit. */
  replace: (config: PartialConfig | null) => void;
  subscribe: (listener: (patch: PartialConfig) => void) => () => void;
  /** Resolves once queued writes reach disk. */
  flush: () => Promise<void>;
};

const objectSchema: Schema<object> = {
  safeParse: (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? { success: true, data: value }
      : { success: false, error: new Error("Config must be a JSON object") },
};

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
  const [remoteRevision, setRemoteRevision] = createSignal(0);
  let pending = Promise.resolve();
  const listeners = new Set<(patch: PartialConfig) => void>();
  const rejections = new Set<(failure: ConfigChangeFailure) => void>();
  let testActive = (): boolean => false;
  const save = (): void => {
    const snapshot = structuredClone(unwrap(config));
    // Serialize writes so an older snapshot can never land last.
    const write = async (): Promise<void> => writeJson(file, snapshot);
    pending = pending.then(write, write);
    // The caller observes failures through flush; later writes can recover.
    void pending.catch(() => undefined);
  };

  if (status !== "ok") save();
  function replaceLocal(next: Config): void {
    if (testActive() && config.funbox.includes("no_quit")) {
      throw new Error("No quit funbox is active. Please finish the test.");
    }
    setConfig(reconcile(next));
    save();
    for (const listener of listeners) {
      listener(structuredClone(unwrap(config)));
    }
  }

  return {
    config,
    remoteRevision,
    status,
    set: (key, value) => {
      const result = resolveConfigChange(key, value, unwrap(config), {
        schema: supportedConfigSchema,
        testActive: testActive(),
      });
      if (!result.ok) {
        for (const listener of rejections) listener(result);
        return false;
      }
      const changes = result.changes.filter(
        (change) => !isDeepStrictEqual(config[change.key], change.value),
      );
      if (changes.length === 0) return true;
      batch(() => {
        for (const change of changes) {
          setConfig(change.key, reconcile(structuredClone(change.value)));
        }
      });
      save();
      const patch = Object.fromEntries(
        changes.map((change) => [change.key, structuredClone(change.value)]),
      ) as PartialConfig;
      for (const listener of listeners) listener(patch);
      return true;
    },
    onReject: (listener) => {
      rejections.add(listener);
      return () => {
        rejections.delete(listener);
      };
    },
    setTestActive: (active) => {
      testActive = active;
    },
    reset: () => {
      replaceLocal(getDefaultConfig());
    },
    apply: (partial) => {
      replaceLocal(
        resolveFullConfig(structuredClone(partial), {
          schema: supportedConfigSchema,
        }).config,
      );
    },
    replace: (remote) => {
      batch(() => {
        setRemoteRevision((revision) => revision + 1);
        setConfig(reconcile(migrateConfig(structuredClone(remote ?? {}))));
      });
      save();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
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
