import { Dynamic } from "@opentui/solid";

import type { ConfigStore } from "./config/store";
import type { ScreenId } from "./router/screens";

import { ConfigContext } from "./config/store";
import { createRouter, RouterContext } from "./router/router";
import { screens } from "./screens";
import { createKeyDispatcher, KeyDispatcherContext } from "./shell/screen-keys";
import { Shell } from "./shell/shell";

export type AppProps = {
  config: ConfigStore;
  initialScreen?: ScreenId;
  onQuit: () => void;
};

export function App(props: AppProps) {
  // oxlint-disable-next-line solid/reactivity -- read once at startup
  const { config, initialScreen } = props;
  const router = createRouter(initialScreen ?? "test");
  const dispatcher = createKeyDispatcher();

  return (
    <ConfigContext.Provider value={config}>
      <RouterContext.Provider value={router}>
        <KeyDispatcherContext.Provider value={dispatcher}>
          <Shell onQuit={props.onQuit}>
            <Dynamic component={screens[router.current()]} />
          </Shell>
        </KeyDispatcherContext.Provider>
      </RouterContext.Provider>
    </ConfigContext.Provider>
  );
}
