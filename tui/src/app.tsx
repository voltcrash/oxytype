import { Dynamic } from "@opentui/solid";

import type { ScreenId } from "./router/screens";

import { createRouter, RouterContext } from "./router/router";
import { screens } from "./screens";
import { createKeyDispatcher, KeyDispatcherContext } from "./shell/screen-keys";
import { Shell } from "./shell/shell";

export type AppProps = {
  initialScreen?: ScreenId;
  onQuit: () => void;
};

export function App(props: AppProps) {
  // oxlint-disable-next-line solid/reactivity -- initial screen only
  const router = createRouter(props.initialScreen ?? "test");
  const dispatcher = createKeyDispatcher();

  return (
    <RouterContext.Provider value={router}>
      <KeyDispatcherContext.Provider value={dispatcher}>
        <Shell onQuit={props.onQuit}>
          <Dynamic component={screens[router.current()]} />
        </Shell>
      </KeyDispatcherContext.Provider>
    </RouterContext.Provider>
  );
}
