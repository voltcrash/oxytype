import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock("../../../src/ts/events/navigation", () => ({
  navigationEvent: { dispatch },
}));

import { Button } from "../../../src/ts/components/common/Button";
import { Link } from "../../../src/ts/components/common/Link";

describe("Link", () => {
  it("runs the caller handler before navigating through the existing router", () => {
    const onClick = vi.fn(() => expect(dispatch).not.toHaveBeenCalled());
    const { getByText } = render(() => (
      <Link href="/settings" onClick={onClick}>
        settings
      </Link>
    ));
    const anchor = getByText("settings");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(anchor, event);
    expect(onClick).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({
      url: (anchor as HTMLAnchorElement).href,
      options: {},
    });
  });

  it("keeps modified clicks on the existing in-app navigation path", () => {
    dispatch.mockClear();
    const { getByText } = render(() => <Link href="/about">about</Link>);
    fireEvent.click(getByText("about"), { ctrlKey: true });
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("routes Button anchors and leaves external anchors native", () => {
    dispatch.mockClear();
    const { getByText } = render(() => (
      <>
        <Button href="/settings" router-link text="internal" />
        <Button href="https://example.com" text="external" />
      </>
    ));
    fireEvent.click(getByText("internal"));
    expect(dispatch).toHaveBeenCalledOnce();
    expect(getByText("internal")).not.toHaveAttribute("target");
    dispatch.mockClear();
    fireEvent.click(getByText("external"));
    expect(dispatch).not.toHaveBeenCalled();
    expect(getByText("external")).toHaveAttribute("target", "_blank");
  });
});
