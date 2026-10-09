import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import { join } from "node:path";

import { App } from "./app";
import { openConfigStore } from "./config/store";
import { resolvePaths } from "./storage/paths";

const paths = resolvePaths();
const config = await openConfigStore(join(paths.config, "config.json"));
const renderer = await createCliRenderer({ exitOnCtrlC: false });

async function quit(): Promise<void> {
  await config.flush();
  renderer.destroy();
}

await render(
  () => <App config={config} onQuit={() => void quit()} />,
  renderer,
);
