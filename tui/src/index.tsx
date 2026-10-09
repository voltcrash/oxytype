import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import { join } from "node:path";

import { App } from "./app";
import { openConfigStore } from "./config/store";
import { resolvePaths } from "./storage/paths";
import { detectColorDepth } from "./theme/depth";

const paths = resolvePaths();
const config = await openConfigStore(join(paths.config, "config.json"));
const renderer = await createCliRenderer({ exitOnCtrlC: false });

async function quit(): Promise<void> {
  await config.flush();
  renderer.destroy();
}

await render(
  () => (
    <App
      config={config}
      colorDepth={detectColorDepth()}
      onQuit={() => void quit()}
    />
  ),
  renderer,
);
