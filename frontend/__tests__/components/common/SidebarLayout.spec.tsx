import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { SidebarLayout } from "../../../src/ts/components/common/SidebarLayout";

const items = {
  first: { text: "first tab", icon: "fa-user" },
  second: { text: "second tab", icon: "fa-key" },
} as const;

beforeEach(() => {
  // jsdom has no ResizeObserver; the sidebar uses it to center itself
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SidebarLayout", () => {
  it("renders an item per tab and the content", () => {
    render(() => (
      <SidebarLayout items={items} active="first" onSelect={() => undefined}>
        <div>content</div>
      </SidebarLayout>
    ));

    expect(screen.getByText("first tab")).toBeInTheDocument();
    expect(screen.getByText("second tab")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("selects a tab on click", () => {
    const [active, setActive] = createSignal<keyof typeof items>("first");
    render(() => (
      <SidebarLayout items={items} active={active()} onSelect={setActive}>
        <div>{active()}</div>
      </SidebarLayout>
    ));

    fireEvent.click(screen.getByText("second tab"));

    expect(active()).toBe("second");
    expect(screen.getByText("second")).toBeInTheDocument();
  });

  it("renders the header above the items", () => {
    render(() => (
      <SidebarLayout
        items={items}
        active={undefined}
        onSelect={() => undefined}
        header={<input placeholder="search" />}
      >
        <div />
      </SidebarLayout>
    ));

    const header = screen.getByPlaceholderText("search");
    const firstItem = screen.getByText("first tab");
    expect(
      header.compareDocumentPosition(firstItem) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the footer below the items", () => {
    render(() => (
      <SidebarLayout
        items={items}
        active="first"
        onSelect={() => undefined}
        footer={<div>footer</div>}
      >
        <div />
      </SidebarLayout>
    ));

    const footer = screen.getByText("footer");
    const lastItem = screen.getByText("second tab");
    expect(
      footer.compareDocumentPosition(lastItem) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });
});
