import { MetaProvider, Style } from "@solidjs/meta";
import { animate } from "animejs";
import {
  createEffect,
  createSignal,
  JSXElement,
  onCleanup,
  onMount,
  Show,
  untrack,
} from "solid-js";
import { spread } from "solid-js/web";
import { debounce, throttle } from "throttle-debounce";

import * as ServerConfiguration from "../../ape/server-configuration";
import { configLoadPromise } from "../../config/lifecycle";
import { Config } from "../../config/store";
import * as MerchBanner from "../../elements/merch-banner";
import { configEvent } from "../../events/config";
import { authPromise } from "../../firebase";
import {
  getFontFace,
  getFontFamily,
  getMediaQueryDebugLevel,
  isAppLoading,
  isFocusCursorHidden,
} from "../../states/app";
import {
  getActivePage,
  getCustomTextIndicator,
  getGlobalOffsetTop,
} from "../../states/core";
import {
  getCrt,
  getFunboxBodyClasses,
  isFunboxReducedMotionIgnored,
} from "../../states/funbox";
import { getResultVisible, isTestActive } from "../../states/test";
import { getTheme } from "../../states/theme";
import * as Caret from "../../test/caret";
import * as CustomText from "../../test/custom-text";
import * as TestUI from "../../test/test-ui";
import { applyFontFamily } from "../../ui";
import { cn } from "../../utils/cn";
import { isColorDark } from "../../utils/colors";
import { onDOMReady } from "../../utils/dom-ready";
import { isDevEnvironment } from "../../utils/env";
import { applyReducedMotion } from "../../utils/misc";
import { convertRemToPixels } from "../../utils/numbers";
import { canQuickRestart } from "../../utils/quick-restart";
import { GlobalEvents } from "./GlobalEvents";
import { NoCssFallback } from "./NoCssFallback";

export type AppElements = {
  element: HTMLElement;
  body: HTMLBodyElement;
  noCssWarning: HTMLElement | null;
};

export function AppEffects(props: AppElements): JSXElement {
  const [isReady, setReady] = createSignal(false);
  // Bootstrap supplies stable host refs for the lifetime of this root.
  const { element, body } = untrack(() => props);

  // Bind only owned classes/styles; legacy focus/funbox/theme writes still coexist.
  spread(
    element,
    {
      get class() {
        return cn(
          element.className.split(/\s+/).filter((name) => name !== "hidden"),
          !isReady() && "hidden",
        );
      },
      get style() {
        return {
          "padding-top": `${getGlobalOffsetTop() + convertRemToPixels(2)}px`,
        };
      },
    },
    false,
    true,
  );
  spread(
    body,
    {
      get class() {
        return cn(
          body.className
            .split(/\s+/)
            .filter(
              (name) =>
                !name.startsWith("fb-") &&
                ![
                  "loading",
                  "darkMode",
                  "crtmode",
                  "ignore-reduced-motion",
                  "mediaQueryDebugLevel1",
                  "mediaQueryDebugLevel2",
                  "mediaQueryDebugLevel3",
                  "cursor-none",
                  "[&_button]:cursor-none!",
                  "[&_a]:cursor-none!",
                ].includes(name),
            ),
          getFunboxBodyClasses(),
          isColorDark(getTheme().bg) && "darkMode",
          getCrt() !== null && "crtmode",
          isFunboxReducedMotionIgnored() && "ignore-reduced-motion",
          isAppLoading() && "loading",
          isFocusCursorHidden() &&
            "cursor-none [&_a]:cursor-none! [&_button]:cursor-none!",
          getMediaQueryDebugLevel() > 0 &&
            `mediaQueryDebugLevel${getMediaQueryDebugLevel()}`,
        );
      },
      get style() {
        return {
          transition: isReady() ? "background .25s, transform .05s" : undefined,
        };
      },
    },
    false,
    true,
  );

  createEffect(() => {
    const font = getFontFamily();
    if (font !== undefined) {
      document.documentElement.style.setProperty("--font", font);
    }
  });
  configEvent.useListener(async ({ key }) => {
    if (key === "fontFamily" || key === "language") await applyFontFamily();
  });

  onMount(() => {
    // Local config starts loading before render; catch its initial font events.
    void applyFontFamily();
    if (isDevEnvironment()) document.title = `${document.title} (localhost)`;

    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (
        !canQuickRestart(
          Config.mode,
          Config.words,
          Config.time,
          CustomText.getData(),
          getCustomTextIndicator()?.isLong ?? false,
        ) &&
        isTestActive()
      ) {
        event.preventDefault();
        // Included for legacy support, e.g. Chrome/Edge < 119.
        // oxlint-disable-next-line no-deprecated
        event.returnValue = "";
      }
    };

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const debouncedEvent = debounce(250, () => {
      if (getActivePage() === "test" && !getResultVisible()) {
        if (Config.tapeMode !== "off") {
          void TestUI.scrollTape();
        } else {
          void TestUI.centerActiveLine();
          void TestUI.updateHintsPositionDebounced();
        }
        const timer = setTimeout(() => {
          timers.delete(timer);
          TestUI.updateWordsInputPosition();
          TestUI.focusWords();
          Caret.show();
        }, 250);
        timers.add(timer);
      }
    });
    const throttledEvent = throttle(250, () => Caret.hide());
    const resize = (): void => {
      throttledEvent();
      debouncedEvent();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("resize", resize);

    let disposed = false;
    let animation: ReturnType<typeof animate> | undefined;
    const registerServiceWorker = (): void => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log(
            "ServiceWorker registration successful with scope: ",
            registration.scope,
          );
        })
        .catch((error: unknown) => {
          console.error("ServiceWorker registration failed: ", error);
        });
    };
    onDOMReady(async () => {
      await configLoadPromise;
      await authPromise;
      if (disposed) return;

      setReady(true);
      MerchBanner.showIfNotClosedBefore();
      animation = animate(element, {
        opacity: [0, 1],
        duration: applyReducedMotion(250),
      });
      void ServerConfiguration.sync();

      if (isDevEnvironment()) {
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            for (const registration of registrations) {
              void registration.unregister();
            }
          });
      } else if ("serviceWorker" in navigator) {
        window.addEventListener("load", registerServiceWorker);
      }
    });
    onCleanup(() => {
      disposed = true;
      animation?.cancel();
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("resize", resize);
      window.removeEventListener("load", registerServiceWorker);
      debouncedEvent.cancel();
      throttledEvent.cancel();
      for (const timer of timers) clearTimeout(timer);
    });
  });

  return (
    <>
      <MetaProvider>
        <Style class="customFont">{getFontFace()}</Style>
      </MetaProvider>
      <GlobalEvents />
      <NoCssFallback element={props.noCssWarning} />
      <Show when={isDevEnvironment()}>
        <div
          class={cn(
            "devIndicator tl fixed top-8 left-8 -z-1 text-[3rem] text-sub opacity-25",
          )}
        >
          local
        </div>
        <div
          class={cn(
            "devIndicator br fixed right-8 bottom-8 -z-1 text-[3rem] text-sub opacity-25",
          )}
        >
          local
        </div>
      </Show>
    </>
  );
}
