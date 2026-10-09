import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import { join } from "node:path";

import { openAccount } from "./account";
import { openNetworkSettings } from "./api/settings";
import { App } from "./app";
import { createAssetSource } from "./assets/source";
import { openConfigStore } from "./config/store";
import { openHistoryStore } from "./results/history";
import { resolvePaths } from "./storage/paths";
import { createTestSources } from "./test/sources";

const paths = resolvePaths();
const config = await openConfigStore(join(paths.config, "config.json"));
const history = await openHistoryStore(join(paths.data, "history.json"));
const settings = await openNetworkSettings(join(paths.config, "network.json"));
const account = await openAccount({ paths, settings, config });
const renderer = await createCliRenderer({ exitOnCtrlC: false });
let quitting = false;

async function quit(): Promise<void> {
  if (quitting) return;
  quitting = true;
  const accountWrites = await Promise.allSettled([account.flush()]);
  account.stop();
  const writes = [
    ...accountWrites,
    ...(await Promise.allSettled([config.flush(), history.flush()])),
  ];
  renderer.destroy();
  for (const write of writes) {
    if (write.status === "rejected") {
      process.exitCode = 1;
      console.error("Could not save local data:", write.reason);
    }
  }
}

await render(
  () => (
    <App
      config={config}
      history={history}
      account={account}
      testOptions={{
        sources: createTestSources(
          createAssetSource({
            cacheDir: paths.cache,
            remote: {
              baseUrl: settings.assetUrl,
              timeoutMs: settings.timeoutMs,
            },
          }),
        ),
      }}
      onQuit={() => void quit()}
    />
  ),
  renderer,
);
