import { Dynamic } from "@opentui/solid";
import { createEffect, on, onCleanup, onMount } from "solid-js";

import type { ConfigStore } from "./config/store";
import type { ScreenId } from "./router/screens";

import { AccountContext, type Account } from "./account";
import { createAssetSource } from "./assets/source";
import { AuthContext, type AuthStore } from "./auth/store";
import { ConfigContext } from "./config/store";
import {
  createHistoryStore,
  HistoryContext,
  localPaceSpeed,
  type HistoryStore,
} from "./results/history";
import { UploadContext } from "./results/upload";
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
  history?: HistoryStore;
  auth?: AuthStore;
  account?: Account;
};

export function App(props: AppProps) {
  // oxlint-disable-next-line solid/reactivity -- read once at startup
  const { config, initialScreen, testOptions, auth, account } = props;
  const router = createRouter(initialScreen ?? "test");
  const dispatcher = createKeyDispatcher();
  const theme = createTheme(config.config);
  // oxlint-disable-next-line solid/reactivity -- app-owned store initialized once
  const history = props.history ?? createHistoryStore();
  const test = createTypingTest({
    store: config,
    sources: createTestSources(createAssetSource()),
    getPaceSpeed: (settings, mode2) =>
      localPaceSpeed(history.entries(), settings, mode2),
    getIdentity: account?.identity,
    ...testOptions,
  });
  createEffect(
    on(test.result, (finished) => {
      if (finished !== undefined && config.config.resultSaving) {
        void history.add(finished);
        void account?.uploads.accept(finished);
      }
    }),
  );

  onMount(() => account?.start());
  onCleanup(() => account?.stop());
  return (
    <AccountContext.Provider value={account}>
      <UploadContext.Provider value={account?.uploads}>
        <AuthContext.Provider value={account?.auth ?? auth}>
          <ConfigContext.Provider value={config}>
            <ThemeContext.Provider value={theme}>
              <RouterContext.Provider value={router}>
                <KeyDispatcherContext.Provider value={dispatcher}>
                  <HistoryContext.Provider value={history}>
                    <TypingTestContext.Provider value={test}>
                      <Shell onQuit={props.onQuit}>
                        <Dynamic component={screens[router.current()]} />
                      </Shell>
                    </TypingTestContext.Provider>
                  </HistoryContext.Provider>
                </KeyDispatcherContext.Provider>
              </RouterContext.Provider>
            </ThemeContext.Provider>
          </ConfigContext.Provider>
        </AuthContext.Provider>
      </UploadContext.Provider>
    </AccountContext.Provider>
  );
}
