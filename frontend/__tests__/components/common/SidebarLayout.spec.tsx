import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const { state } = vi.hoisted(() => ({ state: { popup: false } }));
vi.mock("../../../src/ts/states/overlay-visibility", () => ({
  isAnyPopupVisible: () => state.popup,
}));

// jsdom has no ResizeObserver
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn();
    disconnect = vi.fn();
  },
);

import { SidebarLayout } from "../../../src/ts/components/common/SidebarLayout";

afterEach(() => {
  cleanup();
  state.popup = false;
});

const items = {
  one: { text: "one", icon: "fa-tools" },
  two: { text: "two", icon: "fa-keyboard" },
} as const;

// jsdom isn't a mac, so mod is ctrl
function pressMod(key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    code: `Digit${key}`,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(event);
  document.body.dispatchEvent(
    new KeyboardEvent("keyup", { key, code: `Digit${key}`, bubbles: true }),
  );
  return event;
}

function renderSidebar(
  hotkeys: () => boolean = () => true,
): ReturnType<typeof vi.fn> {
  const onSelect = vi.fn();
  render(() => (
    <SidebarLayout
      items={items}
      active="one"
      onSelect={onSelect}
      hotkeys={hotkeys()}
    >
      content
    </SidebarLayout>
  ));
  return onSelect;
}

describe("SidebarLayout hotkeys", () => {
  it("selects the item at the pressed number", () => {
    const onSelect = renderSidebar();
    const event = pressMod("2");
    expect(onSelect).toHaveBeenCalledWith("two");
    // keeps the browser from switching tabs
    expect(event.defaultPrevented).toBe(true);
    pressMod("1");
    expect(onSelect).toHaveBeenLastCalledWith("one");
  });

  it("ignores numbers without an item", () => {
    const onSelect = renderSidebar();
    const event = pressMod("3");
    expect(onSelect).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("does nothing while disabled or a popup is open", () => {
    const [enabled, setEnabled] = createSignal(false);
    const onSelect = renderSidebar(enabled);
    pressMod("1");
    expect(onSelect).not.toHaveBeenCalled();

    setEnabled(true);
    state.popup = true;
    pressMod("1");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("stops listening once unmounted", () => {
    const onSelect = renderSidebar();
    cleanup();
    pressMod("1");
    expect(onSelect).not.toHaveBeenCalled();
  });
});
