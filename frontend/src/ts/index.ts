// register signal tracking hook before any signals are created
import "./dev/signal-tracker";

//enable solidjs-devtools
import "solid-devtools";

import { init } from "./firebase";
import * as Logger from "./utils/logger";
import * as DB from "./db";
import "./controllers/ad-controller";
import { Config } from "./config/store";
import * as TestTimer from "./test/test-timer";
import * as Result from "./test/result";
import { onAuthStateChanged } from "./auth";
import { enable } from "./states/glarses-mode";
import "./controllers/route-controller";
import { egVideoListener } from "./components/popups/VideoAdPopup";
import "./states/connection";
import "./test/tts";
import { addToGlobal } from "./utils/misc";
import * as Focus from "./test/focus";
import { fetchLatestVersion } from "./utils/version";
import * as Sentry from "./sentry";
import * as Cookies from "./cookies";
import "./elements/psa";
import "./controllers/url-handler";
import { applyEngineSettings } from "./anim";
import { render } from "solid-js/web";
import { App } from "./components/App";
import { setVersion } from "./states/core";
import { loadFromLocalStorage } from "./config/lifecycle";

import "./input/hotkeys";
import { showModal } from "./states/modals";
import { getLastEventLog } from "./states/test";
import { buildEventLog } from "./test/events/data";

// Lock Math.random
Object.defineProperty(Math, "random", {
  value: Math.random,
  writable: false,
  configurable: false,
  enumerable: true,
});

// Freeze Math object
Object.freeze(Math);

// Lock Math on window
Object.defineProperty(window, "Math", {
  value: Math,
  writable: false,
  configurable: false,
  enumerable: true,
});

applyEngineSettings();
void loadFromLocalStorage();
void fetchLatestVersion().then((data) => {
  if (data === null) return;
  setVersion(data);
});

Focus.set(true, true);
const accepted = Cookies.getAcceptedCookies();
if (accepted === null) {
  showModal("Cookies");
}
void init(onAuthStateChanged).then(() => {
  if (accepted !== null) {
    Cookies.activateWhatsAccepted();
  }
});

addToGlobal({
  snapshot: DB.getSnapshot,
  config: Config,
  glarsesMode: enable,
  enableTimerDebug: TestTimer.enableTimerDebug,
  getTimerStats: TestTimer.getTimerStats,
  toggleSmoothedBurst: Result.toggleSmoothedBurst,
  egVideoListener: egVideoListener,
  toggleDebugLogs: Logger.toggleDebugLogs,
  toggleSentryDebug: Sentry.toggleDebug,
  lastEventLog: () => getLastEventLog(),
  currentEventLog: buildEventLog,
});

const appElement = document.getElementById("app");
if (!appElement) throw new Error("App mount not found");
render(
  () =>
    App({
      element: appElement,
      body: document.body as HTMLBodyElement,
      noCssWarning: document.getElementById("nocss"),
    }),
  appElement,
);
