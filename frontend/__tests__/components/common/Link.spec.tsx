import { Router, useBeforeLeave, useLocation } from "@solidjs/router";
import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { JSXElement } from "solid-js";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { Button } from "../../../src/ts/components/common/Button";
import { Link } from "../../../src/ts/components/common/Link";

function renderLinks(
  content: () => JSXElement,
  blocked = false,
): ReturnType<typeof render> {
  return render(() => (
    <Router
      explicitLinks
      preload={false}
      root={() => {
        const location = useLocation();
        useBeforeLeave((event) => {
          if (blocked) event.preventDefault();
        });
        return (
          <>
            {content()}
            <output>{location.pathname + location.hash}</output>
          </>
        );
      }}
    >
      {{ path: "*all" }}
    </Router>
  ));
}

describe("Link", () => {
  beforeEach(() => window.history.replaceState(window.history.state, "", "/"));
  afterEach(cleanup);

  it("runs the caller handler before Solid Router navigation", async () => {
    const onClick = vi.fn(() => expect(window.location.pathname).toBe("/"));
    const { getByText, getByRole } = renderLinks(() => (
      <Link href="/settings" class="text-sub" onClick={onClick}>
        settings
      </Link>
    ));
    const anchor = getByText("settings");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(anchor, event);
    expect(onClick).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    expect(anchor).toHaveAttribute("router-link");
    expect(anchor).toHaveClass("text-sub");
    await waitFor(() =>
      expect(getByRole("status")).toHaveTextContent("/settings"),
    );
  });

  it("honors caller cancellation", () => {
    const { getByText, getByRole } = renderLinks(() => (
      <Link href="/about" onClick={(event) => event.preventDefault()}>
        about
      </Link>
    ));
    fireEvent.click(getByText("about"));
    expect(getByRole("status")).toHaveTextContent("/");
  });

  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])("leaves modified clicks native: %j", (modifiers) => {
    const { getByText, getByRole } = renderLinks(() => (
      <Link href="/about">about</Link>
    ));
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ...modifiers,
    });
    fireEvent(getByText("about"), event);
    expect(event.defaultPrevented).toBe(false);
    expect(getByRole("status")).toHaveTextContent("/");
  });

  it.each([
    { target: "_blank" },
    { download: "file.txt" },
    { rel: "external" },
    { href: "https://example.com" },
  ])("leaves explicit native links alone: %j", (attributes) => {
    const { getByText, getByRole } = renderLinks(() => (
      <Link href="/about" {...attributes}>
        native
      </Link>
    ));
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(getByText("native"), event);
    expect(event.defaultPrevented).toBe(false);
    expect(getByRole("status")).toHaveTextContent("/");
  });

  it("routes same-origin absolute links", async () => {
    const { getByText, getByRole } = renderLinks(() => (
      <Link href={`${window.location.origin}/about`}>about</Link>
    ));
    fireEvent.click(getByText("about"));
    await waitFor(() =>
      expect(getByRole("status")).toHaveTextContent("/about"),
    );
  });

  it("routes Button anchors and leaves external anchors native", async () => {
    const { getByText, getByRole } = renderLinks(() => (
      <>
        <Button href="/settings" router-link text="internal" />
        <Button href="https://example.com" text="external" />
      </>
    ));
    fireEvent.click(getByText("internal"));
    await waitFor(() =>
      expect(getByRole("status")).toHaveTextContent("/settings"),
    );
    expect(getByText("internal")).not.toHaveAttribute("target");
    expect(getByText("external")).not.toHaveAttribute("link");
    expect(getByText("external")).toHaveAttribute("target", "_blank");
  });

  it("obeys Solid Router's before-leave guard", () => {
    const { getByText, getByRole } = renderLinks(
      () => <Link href="/about">about</Link>,
      true,
    );
    fireEvent.click(getByText("about"));
    expect(window.location.pathname).toBe("/");
    expect(getByRole("status")).toHaveTextContent("/");
  });
});
