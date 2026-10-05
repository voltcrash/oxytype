import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { AnimationParams } from "animejs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

const { command, hotkeyHandlers } = vi.hoisted(() => ({
  command: {
    id: "changeThemeAether",
    display: "aether",
    hover: vi.fn(),
    exec: vi.fn(),
  },
  hotkeyHandlers: new Map<string, (event: KeyboardEvent) => void>(),
}));

vi.mock("animejs", () => ({
  animate: (_element: HTMLElement, params: AnimationParams) => {
    queueMicrotask(() => {
      // @ts-expect-error animation callback arguments unused by the lifecycle
      params.onComplete?.();
    });
    return { cancel: vi.fn() };
  },
}));
vi.mock("../../../src/ts/utils/misc", () => ({
  applyReducedMotion: (duration: number) => duration,
}));
vi.mock("../../../src/ts/test/focus", () => ({ set: vi.fn() }));
vi.mock("../../../src/ts/ui", () => ({ clearFontPreview: vi.fn() }));
vi.mock("../../../src/ts/controllers/analytics-controller", () => ({
  log: vi.fn(),
}));
vi.mock("../../../src/ts/controllers/theme-controller", () => ({
  clearPreview: vi.fn(),
}));
vi.mock("../../../src/ts/config/setters", () => ({ setConfig: vi.fn() }));
vi.mock("../../../src/ts/collections/custom-themes", () => ({
  useCustomThemesLiveQuery: () => () => [],
}));
vi.mock("../../../src/ts/commandline/lists", () => {
  const subgroup = { title: "Theme...", list: [command] };
  return {
    doesListExist: () => true,
    getList: async () => subgroup,
    getSingleSubgroup: async () => subgroup,
    getTopOfStack: () => subgroup,
    setStackToDefault: vi.fn(),
    getStackLength: () => 1,
  };
});
vi.mock("../../../src/ts/commandline/util", () => ({
  COMMAND_SEPARATOR_HTML:
    '<i class="fas fa-fw fa-chevron-right chevronIcon"></i>',
}));
vi.mock("../../../src/ts/states/test", () => ({
  setTestFocusState: vi.fn(),
  isLongTest: () => false,
  wordsHaveNewline: () => false,
  wordsHaveTab: () => false,
}));
vi.mock("../../../src/ts/states/hotkeys", () => ({
  hotkeys: { commandline: "Escape", quickRestart: "Tab" },
  quickRestartHotkeyMap: { off: "", esc: "Escape", tab: "Tab", enter: "Enter" },
}));
vi.mock("../../../src/ts/input/hotkeys/utils", () => ({
  createHotkey: (
    hotkey: string | (() => string),
    callback: (event: KeyboardEvent) => void,
    options?: () => { enabled: boolean },
  ) => {
    if (options?.().enabled === false) return;
    hotkeyHandlers.set(
      typeof hotkey === "function" ? hotkey() : hotkey,
      callback,
    );
  },
}));
vi.mock("../../../src/ts/navigation/navigation", () => ({ navigate: vi.fn() }));

import { ThemeIndicator } from "../../../src/ts/components/layout/footer/ThemeIndicator";
import { Commandline } from "../../../src/ts/components/modals/Commandline";
import { Config } from "../../../src/ts/config/store";
import { restartTestEvent } from "../../../src/ts/events/test";
import { commandlineState } from "../../../src/ts/states/commandline";
import {
  setActivePage,
  setCommandlineSubgroup,
} from "../../../src/ts/states/core";
import { hideModalAndClearChain } from "../../../src/ts/states/modals";
import { isAnyPopupVisible } from "../../../src/ts/states/overlay-visibility";
import "../../../src/ts/input/hotkeys/commandline";
import "../../../src/ts/input/hotkeys/quickrestart";

describe("theme picker lifecycle", () => {
  let displayStyles: HTMLStyleElement;

  beforeEach(() => {
    hideModalAndClearChain("Commandline");
    setCommandlineSubgroup(null);
    setActivePage("test");
    commandlineState.isAnimating = false;
    commandlineState.noBackground = false;
    Config.customTheme = false;
    command.id = "changeThemeAether";
    vi.clearAllMocks();

    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.open = false;
    });
    vi.spyOn(HTMLDialogElement.prototype, "getClientRects").mockImplementation(
      function (this: HTMLDialogElement) {
        return {
          length: getComputedStyle(this).display === "none" ? 0 : 1,
        } as DOMRectList;
      },
    );
    HTMLElement.prototype.scrollIntoView = vi.fn();

    displayStyles = document.createElement("style");
    displayStyles.textContent = `
      dialog { display: none; }
      dialog.flex { display: flex; }
      dialog.hidden { display: none; }
      dialog.open\\:flex[open] { display: flex; }
    `;
    document.head.append(displayStyles);
  });

  afterEach(() => {
    cleanup();
    hideModalAndClearChain("Commandline");
    setCommandlineSubgroup(null);
    displayStyles.remove();
    vi.restoreAllMocks();
  });

  it.each(["selection", "escape", "backdrop"] as const)(
    "restores restart and command-line shortcuts after %s",
    async (dismissal) => {
      const view = render(() => (
        <>
          <ThemeIndicator />
          <Commandline />
        </>
      ));
      const dialog = view.container.querySelector(
        "dialog",
      ) as HTMLDialogElement;
      const restart = vi.fn();
      const unsubscribe = restartTestEvent.subscribe(restart);
      try {
        fireEvent.click(
          view.getByRole("button", {
            name: "Shift-click to toggle custom theme",
          }),
        );
        await waitFor(() => expect(dialog.open).toBe(true));
        expect(commandlineState.noBackground).toBe(true);
        expect(command.hover).toHaveBeenCalled();

        hotkeyHandlers.get("Tab")?.(
          new KeyboardEvent("keydown", { key: "Tab" }),
        );
        expect(restart).not.toHaveBeenCalled();

        if (dismissal === "selection") {
          // Swatch/text children have pointer-events:none in the browser.
          fireEvent.click(
            view.getByText("aether").closest(".command") as HTMLElement,
          );
        } else if (dismissal === "escape") {
          fireEvent.keyDown(view.getByRole("textbox"), { key: "Escape" });
        } else {
          fireEvent.mouseDown(dialog);
        }
        await waitFor(() => expect(commandlineState.open).toBe(false));
        expect(dialog.open).toBe(false);
        expect(commandlineState.isAnimating).toBe(false);
        expect(getComputedStyle(dialog).display).toBe("none");
        expect(isAnyPopupVisible()).toBe(false);
        expect(command.exec).toHaveBeenCalledTimes(
          dismissal === "selection" ? 1 : 0,
        );

        hotkeyHandlers.get("Tab")?.(
          new KeyboardEvent("keydown", { key: "Tab" }),
        );
        expect(restart).toHaveBeenCalledWith({ isQuickRestart: true });
        hotkeyHandlers.get("Escape")?.(
          new KeyboardEvent("keydown", { key: "Escape" }),
        );
        await waitFor(() => expect(dialog.open).toBe(true));
      } finally {
        unsubscribe();
      }
    },
  );
});
