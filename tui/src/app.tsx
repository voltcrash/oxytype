import { Dynamic } from "@opentui/solid";

import type { ConfigStore } from "./config/store";
import type { ScreenId } from "./router/screens";

import { createAssetSource } from "./assets/source";
import { ConfigContext } from "./config/store";
import { createRouter, RouterContext } from "./router/router";
import { screens } from "./screens";
import { createKeyDispatcher, KeyDispatcherContext } from "./shell/screen-keys";
import { Shell } from "./shell/shell";
import { createTestSources } from "./test/sources";
import {
  createTypingTest,
  TypingTestContext,
  type TypingTestOptions,
} from "./test/typing-test";
import { createTheme, ThemeContext } from "./theme/theme";

export type AppProps = {
  config: ConfigStore;
  initialScreen?: ScreenId;
  onQuit: () => void;
  testOptions?: Partial<Omit<TypingTestOptions, "store">>;
};

export function App(props: AppProps) {
  // oxlint-disable-next-line solid/reactivity -- read once at startup
  const { config, initialScreen, testOptions } = props;
  const router = createRouter(initialScreen ?? "test");
  const dispatcher = createKeyDispatcher();
  const theme = createTheme(config.config);
  const test = createTypingTest({
    store: config,
    sources: createTestSources(createAssetSource()),
    ...testOptions,
  });

  return (
    <ConfigContext.Provider value={config}>
      <ThemeContext.Provider value={theme}>
        <RouterContext.Provider value={router}>
          <KeyDispatcherContext.Provider value={dispatcher}>
            <TypingTestContext.Provider value={test}>
              <Shell onQuit={props.onQuit}>
                <Dynamic component={screens[router.current()]} />
              </Shell>
            </TypingTestContext.Provider>
          </KeyDispatcherContext.Provider>
        </RouterContext.Provider>
      </ThemeContext.Provider>
    </ConfigContext.Provider>
  );
}
