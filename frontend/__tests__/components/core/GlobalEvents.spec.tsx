import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state, focusWords, popupVisible, notify } = vi.hoisted(() => ({
  state: {
    transition: false,
    page: "test",
    result: false,
    inputFocused: false,
    popup: false,
    warning: true,
  },
  focusWords: vi.fn(),
  popupVisible: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("../../../src/ts/config/store", () => ({
  Config: {
    get showOutOfFocusWarning() {
      return state.warning;
    },
  },
}));
vi.mock("../../../src/ts/states/core", () => ({
  getActivePage: () => state.page,
}));
vi.mock("../../../src/ts/states/page-transition", () => ({
  get: () => state.transition,
}));
vi.mock("../../../src/ts/states/test", () => ({
  getResultVisible: () => state.result,
}));
vi.mock("../../../src/ts/input/input-element", () => ({
  isInputElementFocused: () => state.inputFocused,
}));
vi.mock("../../../src/ts/test/test-ui", () => ({ focusWords }));
vi.mock("../../../src/ts/utils/misc", () => ({
  isAnyPopupVisible: () => {
    popupVisible();
    return state.popup;
  },
}));
vi.mock("../../../src/ts/utils/env", () => ({ isDevEnvironment: () => true }));
vi.mock("../../../src/ts/states/notifications", () => ({
  showErrorNotification: notify,
}));

import { GlobalEvents } from "../../../src/ts/components/core/GlobalEvents";

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, {
    transition: false,
    page: "test",
    result: false,
    inputFocused: false,
    popup: false,
    warning: true,
  });
});
afterEach(cleanup);
function press(
  key: string,
  target: HTMLElement = document.body,
  options: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

describe("Global events", () => {
  it("autofocuses eligible keys and preserves warning/modifier behavior", () => {
    render(() => <GlobalEvents />);
    expect(press("a").defaultPrevented).toBe(true);
    expect(focusWords).toHaveBeenCalledOnce();
    state.warning = false;
    expect(press("b").defaultPrevented).toBe(false);
    for (const key of ["Enter", " ", "Escape", "Tab", "Shift"]) press(key);
    press("c", document.body, { ctrlKey: true });
    expect(focusWords).toHaveBeenCalledTimes(2);
  });

  it("skips transitions, results, focused inputs and popups", () => {
    render(() => <GlobalEvents />);
    for (const field of ["transition", "result", "inputFocused"] as const) {
      state[field] = true;
      press("a");
      state[field] = false;
    }
    expect(popupVisible).not.toHaveBeenCalled();
    state.popup = true;
    press("a");
    expect(focusWords).not.toHaveBeenCalled();
    expect(popupVisible).toHaveBeenCalledOnce();
  });

  it("prevents space scrolling on body/results and cleans up handlers", () => {
    const previousError = window.onerror;
    const previousRejection = window.onunhandledrejection;
    const { unmount } = render(() => <GlobalEvents />);
    const result = document.createElement("div");
    result.id = "result";
    document.body.append(result);
    expect(press(" ", document.body, { code: "Space" }).defaultPrevented).toBe(
      true,
    );
    expect(press(" ", result, { code: "Space" }).defaultPrevented).toBe(true);
    unmount();
    expect(window.onerror).toBe(previousError);
    expect(window.onunhandledrejection).toBe(previousRejection);
    expect(press(" ", document.body, { code: "Space" }).defaultPrevented).toBe(
      false,
    );
    press("a");
    expect(focusWords).not.toHaveBeenCalled();
    result.remove();
  });
});
