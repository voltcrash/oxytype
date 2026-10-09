import { createContext, useContext } from "solid-js";
import { join } from "node:path";

import { createApi, type Api, type Fetch } from "./api/client";
import type { NetworkSettings } from "./api/settings";
import { openCredentials } from "./auth/credentials";
import type { UploadIdentity } from "./auth/identity";
import {
  createAuthStore,
  type AuthOptions,
  type AuthStore,
} from "./auth/store";
import type { ConfigStore } from "./config/store";
import { createConfigSync, type ConfigSync } from "./config/sync";
import { openQuoteFavorites, type QuoteFavorites } from "./results/favorites";
import { openActiveTags, type ActiveTags } from "./results/tags";
import { createResultUploader, type ResultUploader } from "./results/upload";
import { openUploadQueue, type UploadQueue } from "./results/upload-queue";
import type { AppPaths } from "./storage/paths";

export type Account = {
  api: Api;
  auth: AuthStore;
  sync: ConfigSync;
  uploads: ResultUploader;
  queue: UploadQueue;
  tags: ActiveTags;
  favorites: QuoteFavorites;
  identity: () => UploadIdentity | undefined;
  start: () => void;
  stop: () => void;
  flush: () => Promise<void>;
};
export async function openAccount(options: {
  paths: AppPaths;
  settings: NetworkSettings;
  config: ConfigStore;
  fetch?: Fetch;
  browser?: AuthOptions["browser"];
  poll?: AuthOptions["poll"];
  intervalMs?: number;
}): Promise<Account> {
  const credentials = await openCredentials(
    join(options.paths.data, "credentials.json"),
    options.settings.apiUrl,
  );
  const queue = await openUploadQueue(join(options.paths.data, "uploads.json"));
  let rawAuth: AuthStore;
  let sync: ConfigSync;
  let initialized = false;
  const api = createApi({
    settings: options.settings,
    fetch: options.fetch,
    token: () => credentials.get()?.accessToken,
    onUnauthorized: () => {
      rawAuth.invalidate();
      sync.reset();
      initialized = false;
    },
  });
  rawAuth = createAuthStore({
    api,
    credentials,
    browser: options.browser,
    poll: options.poll,
  });
  const identity = (): UploadIdentity | undefined => {
    const credential = credentials.get();
    if (
      credential === undefined ||
      credential.expiresAt <= Date.now() ||
      rawAuth.user()?.uid !== credential.user.uid
    ) {
      return undefined;
    }
    return {
      uid: credential.user.uid,
      apiUrl: credential.apiUrl,
      online: rawAuth.online(),
    };
  };
  const tags = await openActiveTags(
    join(options.paths.data, "active-tags.json"),
    () => {
      const user = rawAuth.user();
      return user === undefined
        ? undefined
        : `${options.settings.apiUrl}|${user.uid}`;
    },
  );
  const favorites = await openQuoteFavorites(
    join(options.paths.data, "quote-favorites.json"),
    api,
    () => {
      const user = rawAuth.user();
      return user === undefined
        ? undefined
        : `${options.settings.apiUrl}|${user.uid}`;
    },
  );
  sync = createConfigSync({ api, store: options.config, identity });
  const uploads = createResultUploader({ api, queue, identity });
  let stopped = false;
  let reconnecting: Promise<boolean> | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  async function connected(): Promise<void> {
    if (stopped || rawAuth.state() !== "authenticated") return;
    if (!initialized) initialized = await sync.login();
    else await sync.retry();
    if (!stopped) await uploads.drain();
  }
  async function reconnect(): Promise<boolean> {
    if (stopped) return false;
    reconnecting ??= (async () => {
      const valid = await rawAuth.check();
      if (valid) {
        await connected();
      } else if (rawAuth.user() === undefined) {
        initialized = false;
        sync.reset();
      }
      return valid;
    })().finally(() => {
      reconnecting = undefined;
    });
    return await reconnecting;
  }
  const auth: AuthStore = {
    ...rawAuth,
    login: async () => {
      sync.reset();
      initialized = false;
      await rawAuth.login();
      await connected();
    },
    check: reconnect,
    logout: async () => {
      sync.reset();
      initialized = false;
      await rawAuth.logout();
    },
  };
  return {
    api,
    auth,
    sync,
    uploads,
    queue,
    tags,
    favorites,
    identity,
    start: () => {
      if (timer !== undefined || stopped) return;
      void reconnect();
      timer = setInterval(() => void reconnect(), options.intervalMs ?? 30_000);
    },
    stop: () => {
      stopped = true;
      clearInterval(timer);
      rawAuth.cancel();
      sync.dispose();
    },
    flush: async () => {
      await uploads.flush();
      const writes = await Promise.allSettled([
        credentials.flush(),
        queue.flush(),
        sync.flush(),
        tags.flush(),
        favorites.flush(),
      ]);
      for (const write of writes) {
        if (write.status === "rejected") throw write.reason;
      }
    },
  };
}
export const AccountContext = createContext<Account>();
export function useAccount(): Account | undefined {
  return useContext(AccountContext);
}
