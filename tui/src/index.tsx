import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";

import { App } from "./app";

const renderer = await createCliRenderer({ exitOnCtrlC: false });
await render(() => <App onQuit={() => renderer.destroy()} />, renderer);
