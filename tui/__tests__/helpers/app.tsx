import { join } from "node:path";

import type { AppProps } from "../../src/app";

import { App } from "../../src/app";
import { openConfigStore } from "../../src/config/store";
import { renderTui } from "./render";
import { tempDir } from "./temp-dir";

export async function renderApp(
  props: Partial<AppProps> = {},
): ReturnType<typeof renderTui> {
  const config =
    props.config ??
    (await openConfigStore(join(await tempDir(), "config.json")));
  // Finish the first-run write before the temporary directory is removed.
  await config.flush();
  return renderTui(() => (
    <App
      config={config}
      colorDepth={props.colorDepth ?? "truecolor"}
      initialScreen={props.initialScreen}
      onQuit={props.onQuit ?? (() => undefined)}
    />
  ));
}
