import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deferred, lifecycle, guards, ui, services } = vi.hoisted(() => {
  const deferred = (): { promise: Promise<void>; resolve: () => void } => {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve: () => resolve() };
  };
  return {
    deferred,
    lifecycle: { config: deferred(), auth: deferred() },
    guards: {
      page: "test",
      result: false,
      active: true,
      quickRestart: false,
      dev: true,
    },
    ui: {
      applyFont: vi.fn(),
      hideCaret: vi.fn(),
      showCaret: vi.fn(),
      scrollTape: vi.fn(),
      centerLine: vi.fn(),
      hints: vi.fn(),
      positionInput: vi.fn(),
      focus: vi.fn(),
    },
    services: {
      sync: vi.fn(),
      merch: vi.fn(),
      unregister: vi.fn(),
      cancel: vi.fn(),
      animate: vi.fn(),
    },
  };
});
vi.mock("../../../src/ts/config/lifecycle", () => ({
  get configLoadPromise() {
    return lifecycle.config.promise;
  },
}));
vi.mock("../../../src/ts/firebase", () => ({
  get authPromise() {
    return lifecycle.auth.promise;
  },
}));
vi.mock("../../../src/ts/config/store", () => ({
  Config: { mode: "words", words: 10, time: 15, tapeMode: "off" },
}));
vi.mock("../../../src/ts/states/core", async () => {
  const { createSignal } = await import("solid-js");
  const [getGlobalOffsetTop, setGlobalOffsetTop] = createSignal(0);
  return {
    getGlobalOffsetTop,
    setGlobalOffsetTop,
    getActivePage: () => guards.page,
    getCustomTextIndicator: () => undefined,
  };
});
vi.mock("../../../src/ts/states/test", () => ({
  getResultVisible: () => guards.result,
  isTestActive: () => guards.active,
}));
vi.mock("../../../src/ts/test/caret", () => ({
  hide: ui.hideCaret,
  show: ui.showCaret,
}));
vi.mock("../../../src/ts/test/custom-text", () => ({ getData: () => ({}) }));
vi.mock("../../../src/ts/test/test-ui", () => ({
  scrollTape: ui.scrollTape,
  centerActiveLine: ui.centerLine,
  updateHintsPositionDebounced: ui.hints,
  updateWordsInputPosition: ui.positionInput,
  focusWords: ui.focus,
}));
vi.mock("../../../src/ts/ui", () => ({ applyFontFamily: ui.applyFont }));
vi.mock("../../../src/ts/utils/dom-ready", () => ({
  onDOMReady: (callback: () => void) => callback(),
}));
vi.mock("../../../src/ts/utils/env", () => ({
  isDevEnvironment: () => guards.dev,
}));
vi.mock("../../../src/ts/utils/misc", () => ({
  applyReducedMotion: (value: number) => value,
}));
vi.mock("../../../src/ts/utils/numbers", () => ({
  convertRemToPixels: (value: number) => value * 16,
}));
vi.mock("../../../src/ts/utils/quick-restart", () => ({
  canQuickRestart: () => guards.quickRestart,
}));
vi.mock("../../../src/ts/ape/server-configuration", () => ({
  sync: services.sync,
}));
vi.mock("../../../src/ts/elements/merch-banner", () => ({
  showIfNotClosedBefore: services.merch,
}));
vi.mock("../../../src/ts/components/core/GlobalEvents", () => ({
  GlobalEvents: () => null,
}));
vi.mock("animejs", () => ({
  animate: (...args: unknown[]) => {
    services.animate(...args);
    return { cancel: services.cancel };
  },
}));

import {
  setCrt,
  setFunboxBodyClasses,
  setFunboxReducedMotionIgnored,
} from "../../../src/ts/states/funbox";
import { AppEffects } from "../../../src/ts/components/core/AppEffects";
import { configEvent } from "../../../src/ts/events/config";
import {
  setAppLoading,
  setFontFace,
  setFontFamily,
  setFocusCursorHidden,
  setMediaQueryDebugLevel,
} from "../../../src/ts/states/app";
import { setGlobalOffsetTop } from "../../../src/ts/states/core";

let element: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  lifecycle.config = deferred();
  lifecycle.auth = deferred();
  Object.assign(guards, {
    page: "test",
    result: false,
    active: true,
    quickRestart: false,
    dev: true,
  });
  setCrt(null);
  setFunboxBodyClasses([]);
  setFunboxReducedMotionIgnored(false);
  setAppLoading(true);
  setFocusCursorHidden(false);
  setFontFace("");
  setFontFamily(undefined);
  setMediaQueryDebugLevel(0);
  setGlobalOffsetTop(0);
  element = document.createElement("div");
  element.className = "content-grid focus hidden";
  element.innerHTML = "<input />";
  document.body.className = "legacy crt";
  document.body.append(element);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistrations: async () => [{ unregister: services.unregister }],
    },
  });
});
afterEach(() => {
  cleanup();
  element.remove();
  document.body.className = "";
  document.body.style.removeProperty("transition");
  document.documentElement.style.removeProperty("--font");
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.useRealTimers();
});
function mount(): ReturnType<typeof render> {
  return render(() => (
    <AppEffects
      element={element}
      body={document.body as HTMLBodyElement}
      noCssWarning={null}
    />
  ));
}

async function ready(): Promise<void> {
  lifecycle.config.resolve();
  lifecycle.auth.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("App effects", () => {
  it("waits for config and auth before revealing the shell", async () => {
    mount();
    expect(element).toHaveClass("hidden", "focus");
    expect(element.querySelector("input")).not.toBeNull();
    expect(services.animate).not.toHaveBeenCalled();
    lifecycle.config.resolve();
    await Promise.resolve();
    expect(element).toHaveClass("hidden");
    await ready();
    expect(element).not.toHaveClass("hidden");
    expect(document.body.style.transition).toBe(
      "background .25s, transform .05s",
    );
    expect(services.animate).toHaveBeenCalledWith(element, {
      opacity: [0, 1],
      duration: 250,
    });
    expect(services.sync).toHaveBeenCalledOnce();
    expect(services.merch).toHaveBeenCalledOnce();
    expect(services.unregister).toHaveBeenCalledOnce();
  });

  it("binds owned classes, padding and fonts while preserving legacy changes", () => {
    mount();
    expect(document.body).toHaveClass("loading", "crt");
    document.body.className += " extra-funbox";
    setMediaQueryDebugLevel(2);
    setAppLoading(false);
    setFocusCursorHidden(true);
    setFunboxBodyClasses(["fb-read-ahead"]);
    setCrt({});
    setFunboxReducedMotionIgnored(true);
    expect(document.body).toHaveClass(
      "fb-read-ahead",
      "crtmode",
      "ignore-reduced-motion",
      "extra-funbox",
    );
    setFunboxBodyClasses([]);
    setCrt(null);
    expect(document.body).not.toHaveClass("fb-read-ahead", "crtmode");
    expect(document.body).toHaveClass("ignore-reduced-motion", "extra-funbox");
    expect(
      document.body.className
        .split(/\s+/)
        .filter((name) => name === "ignore-reduced-motion"),
    ).toHaveLength(1);
    setGlobalOffsetTop(40);
    setFontFamily('"LOCALCUSTOM",monospace');
    setFontFace("@font-face { font-family: LOCALCUSTOM; }");
    expect(document.body).toHaveClass(
      "legacy",
      "crt",
      "extra-funbox",
      "mediaQueryDebugLevel2",
    );
    expect(document.body).not.toHaveClass("loading");
    expect(document.body).toHaveClass(
      "cursor-none",
      "[&_button]:cursor-none!",
      "[&_a]:cursor-none!",
    );
    setFocusCursorHidden(false);
    expect(document.body).not.toHaveClass("cursor-none");
    expect(element.style.paddingTop).toBe("72px");
    expect(document.documentElement.style.getPropertyValue("--font")).toBe(
      '"LOCALCUSTOM",monospace',
    );
    expect(document.head.querySelector(".customFont")?.textContent).toContain(
      "LOCALCUSTOM",
    );
    setMediaQueryDebugLevel(0);
    expect(document.body).not.toHaveClass("mediaQueryDebugLevel2");
  });

  it("guards active tests on unload and cancels resize work on disposal", () => {
    vi.useFakeTimers();
    const { unmount } = mount();
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    guards.quickRestart = true;
    const quickUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(quickUnload);
    expect(quickUnload.defaultPrevented).toBe(false);
    window.dispatchEvent(new Event("resize"));
    expect(ui.hideCaret).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(250);
    expect(ui.centerLine).toHaveBeenCalledOnce();
    unmount();
    vi.advanceTimersByTime(1000);
    expect(ui.positionInput).not.toHaveBeenCalled();
    expect(ui.showCaret).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("resize"));
    expect(ui.hideCaret).toHaveBeenCalledOnce();
  });

  it("removes config listeners and ignores startup after disposal", async () => {
    const { unmount } = mount();
    expect(ui.applyFont).toHaveBeenCalledOnce();
    configEvent.dispatch({
      key: "language",
      newValue: "english",
      previousValue: "english",
    });
    expect(ui.applyFont).toHaveBeenCalledTimes(2);
    unmount();
    configEvent.dispatch({
      key: "language",
      newValue: "english",
      previousValue: "english",
    });
    expect(ui.applyFont).toHaveBeenCalledTimes(2);
    await ready();
    expect(services.animate).not.toHaveBeenCalled();
    expect(services.sync).not.toHaveBeenCalled();
  });
});
