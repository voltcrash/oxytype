import { join } from "node:path";

import type { AppProps } from "../../src/app";

import { App } from "../../src/app";
import { openConfigStore } from "../../src/config/store";
import { renderTui } from "./render";
import { tempDir } from "./temp-dir";

export async function renderApp(
  props: Partial<AppProps> = {},
  size?: { width: number; height: number },
): ReturnType<typeof renderTui> {
  const config =
    props.config ??
    (await openConfigStore(join(await tempDir(), "config.json")));
  // Finish the first-run write before the temporary directory is removed.
  await config.flush();
  const app = await renderTui(
    () => (
      <App
        config={config}
        initialScreen={props.initialScreen}
        testOptions={props.testOptions}
        history={props.history}
        auth={props.auth}
        account={props.account}
        onQuit={props.onQuit ?? (() => undefined)}
      />
    ),
    size,
  );
  await app.waitForFrame((frame) => !frame.includes("loading words"));
  return app;
}
