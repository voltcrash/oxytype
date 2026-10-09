import type { PartialConfig } from "@oxytype/schemas/configs";
import { supportedConfigSchema } from "@oxytype/typing-core/config/migrate";
import { isDeepStrictEqual } from "node:util";
import { createSignal, type Accessor } from "solid-js";

import type { Api } from "../api/client";
import { responseError } from "../api/client";
import type { UploadIdentity } from "../auth/identity";
import { errorMessage } from "../auth/store";
import type { ConfigStore } from "./store";

export type ConfigSync = {
  state: Accessor<"local" | "pulling" | "pending" | "synced" | "error">;
  notice: Accessor<string | undefined>;
  login: () => Promise<boolean>;
  retry: () => Promise<void>;
  reset: () => void;
  flush: () => Promise<void>;
  dispose: () => void;
};

export function createConfigSync(options: {
  api: Api;
  store: ConfigStore;
  identity: () => UploadIdentity | undefined;
  delayMs?: number;
}): ConfigSync {
  const { api, store, identity } = options;
  const [state, setState] =
    createSignal<ReturnType<ConfigSync["state"]>>("local");
  const [notice, setNotice] = createSignal<string>();
  let edits: PartialConfig = {};
  let owner: UploadIdentity | undefined;
  let initialized = false;
  let version = 0;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let work = Promise.resolve();
  const sameOwner = (current: UploadIdentity | undefined): boolean =>
    current !== undefined &&
    current.uid === owner?.uid &&
    current.apiUrl === owner.apiUrl;
  function reset(): void {
    version++;
    clearTimeout(timer);
    initialized = false;
    edits = {};
    owner = undefined;
    setState("local");
    setNotice(undefined);
  }
  async function serialize(operation: () => Promise<void>): Promise<void> {
    work = work.then(operation, operation);
    return work;
  }
  async function push(): Promise<void> {
    clearTimeout(timer);
    await serialize(async () => {
      const current = identity();
      if (
        !initialized ||
        !sameOwner(current) ||
        current?.online !== true ||
        Object.keys(edits).length === 0
      ) {
        return;
      }
      const snapshot = structuredClone(edits);
      const revision = version;
      try {
        const response = await api.client.configs.save({ body: snapshot });
        if (revision !== version || disposed) return;
        if (response.status !== 200) throw responseError(response);
        edits = Object.fromEntries(
          Object.entries(edits).filter(
            ([key, value]) =>
              !isDeepStrictEqual(value, snapshot[key as keyof PartialConfig]),
          ),
        );
        setState(Object.keys(edits).length === 0 ? "synced" : "pending");
        setNotice(undefined);
      } catch (error) {
        if (revision !== version || disposed) return;
        setState("error");
        setNotice(`Config sync failed: ${errorMessage(error)}`);
      }
    });
  }
  const unsubscribe = store.subscribe((patch) => {
    if (disposed || state() === "pulling") return;
    const current = identity();
    if (current === undefined) return;
    owner ??= current;
    if (!sameOwner(current)) return;
    edits = { ...edits, ...supportedConfigSchema.partial().parse(patch) };
    setState("pending");
    clearTimeout(timer);
    timer = setTimeout(() => void push(), options.delayMs ?? 500);
  });
  return {
    state,
    notice,
    reset,
    login: async () => {
      reset();
      const current = identity();
      if (current?.online !== true || disposed) return false;
      owner = current;
      const revision = version;
      let success = false;
      setState("pulling");
      await serialize(async () => {
        if (revision !== version || disposed || !sameOwner(identity())) return;
        try {
          const response = await api.client.configs.get();
          if (revision !== version || disposed || !sameOwner(identity())) {
            return;
          }
          if (response.status !== 200) throw responseError(response);
          store.replace(response.body.data);
          await store.flush();
          initialized = true;
          success = true;
          setState("synced");
        } catch (error) {
          if (revision !== version || disposed) return;
          setState("error");
          setNotice(`Config download failed: ${errorMessage(error)}`);
        }
      });
      return success;
    },
    retry: push,
    flush: async () => {
      await push();
      await work;
    },
    dispose: () => {
      disposed = true;
      reset();
      unsubscribe();
    },
  };
}
