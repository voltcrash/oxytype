import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import { join } from "node:path";

import { App } from "./app";
import { createAssetSource } from "./assets/source";
import { openConfigStore } from "./config/store";
import { openHistoryStore } from "./results/history";
import { resolvePaths } from "./storage/paths";
import { createTestSources } from "./test/sources";

const paths = resolvePaths();
const config = await openConfigStore(join(paths.config, "config.json"));
const history = await openHistoryStore(join(paths.data, "history.json"));
const renderer = await createCliRenderer({ exitOnCtrlC: false });

async function quit(): Promise<void> {
  const writes = await Promise.allSettled([config.flush(), history.flush()]);
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
      testOptions={{
        sources: createTestSources(
          createAssetSource({ cacheDir: paths.cache }),
        ),
      }}
      onQuit={() => void quit()}
    />
  ),
  renderer,
);
