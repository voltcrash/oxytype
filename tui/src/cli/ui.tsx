import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import { join } from "node:path";
import { ErrorBoundary } from "solid-js";

import type { Runtime } from "./runtime";

import { App } from "../app";
import { createAssetSource } from "../assets/source";
import { openHistoryStore } from "../results/history";
import { openTextLibrary } from "../storage/texts";
import { createTestSources } from "../test/sources";

export async function runUi(runtime: Runtime): Promise<void> {
  const { paths, config, account, settings, logger } = runtime;
  const history = await openHistoryStore(join(paths.data, "history.json"));
  const texts = await openTextLibrary(join(paths.data, "custom-texts.json"));
  const renderer = await createCliRenderer({ exitOnCtrlC: false });
  let quitting = false;
  let resolveDone = (): void => undefined;
  let rejectDone = (_error: unknown): void => undefined;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  void done.catch(() => undefined);
  async function quit(error?: unknown): Promise<void> {
    if (quitting) return;
    quitting = true;
    if (error !== undefined) logger.error("ui.failed", error);
    account.stop();
    // oxlint-disable-next-line promise/no-promise-in-callback -- renderer callbacks must flush pending writes before teardown
    const writes = await Promise.allSettled([history.flush(), texts.flush()]);
    renderer.destroy();
    for (const write of writes) {
      if (write.status === "rejected") {
        logger.error("storage.flush", write.reason);
        error ??= write.reason;
      }
    }
    if (error === undefined) resolveDone();
    else rejectDone(error);
  }
  const signal = (): void => void quit();
  const fatal = (error: unknown): void => void quit(error);
  process.once("SIGINT", signal);
  process.once("SIGTERM", signal);
  process.once("uncaughtException", fatal);
  process.once("unhandledRejection", fatal);
  try {
    await render(
      () => (
        <ErrorBoundary
          fallback={(error: unknown) => {
            queueMicrotask(() => void quit(error));
            return <text>Unexpected error. Restoring terminal…</text>;
          }}
        >
          <App
            config={config}
            history={history}
            account={account}
            testOptions={{
              texts,
              sources: createTestSources(
                createAssetSource({
                  cacheDir: paths.cache,
                  remote: {
                    baseUrl: settings.assetUrl,
                    timeoutMs: settings.timeoutMs,
                  },
                }),
                () => ({ favoriteQuotes: account.favorites.get() }),
              ),
            }}
            onQuit={() => void quit()}
          />
        </ErrorBoundary>
      ),
      renderer,
    );
    await done;
  } finally {
    process.off("SIGINT", signal);
    process.off("SIGTERM", signal);
    process.off("uncaughtException", fatal);
    process.off("unhandledRejection", fatal);
    renderer.destroy();
  }
}
