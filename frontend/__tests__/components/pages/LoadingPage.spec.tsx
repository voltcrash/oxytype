import { cleanup, render } from "@solidjs/testing-library";
import { AnimationParams } from "animejs";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const { mockAnimate } = vi.hoisted(() => ({
  mockAnimate: vi.fn((_el: HTMLElement, params: AnimationParams) => {
    // @ts-expect-error onComplete args not needed in test
    params.onComplete?.();
    return { pause: vi.fn() };
  }),
}));

vi.mock("animejs", () => ({
  animate: mockAnimate,
}));

import { LoadingPage } from "../../../src/ts/components/pages/LoadingPage";
import * as LoadingPageState from "../../../src/ts/states/loading-page";

describe("LoadingPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    LoadingPageState.showSpinner();
  });

  function renderPage(): Record<
    "spinner" | "error" | "bar" | "text",
    HTMLElement
  > {
    const { container } = render(() => <LoadingPage />);
    const children = (container.firstElementChild as HTMLElement)
      .children as HTMLCollectionOf<HTMLElement>;
    return {
      spinner: children[0] as HTMLElement,
      error: children[1] as HTMLElement,
      bar: children[2] as HTMLElement,
      text: children[3] as HTMLElement,
    };
  }

  it("shows spinner by default", () => {
    const { spinner, error, bar, text } = renderPage();
    expect(spinner).not.toHaveClass("hidden");
    expect(error).toHaveClass("hidden");
    expect(bar).toHaveClass("hidden");
    expect(text).toHaveClass("hidden");
    expect(text).toHaveTextContent("Loading...");
  });

  it("switches between error, bar and spinner", async () => {
    const { spinner, error, bar, text } = renderPage();

    LoadingPageState.showError();
    expect(spinner).toHaveClass("hidden");
    expect(error).not.toHaveClass("hidden");
    expect(bar).toHaveClass("hidden");

    await LoadingPageState.showBar();
    expect(error).toHaveClass("hidden");
    expect(bar).not.toHaveClass("hidden");

    LoadingPageState.showSpinner();
    expect(spinner).not.toHaveClass("hidden");
    expect(bar).toHaveClass("hidden");
    expect(text).toHaveClass("hidden");
  });

  it("updateText shows text, mode change hides it", () => {
    const { text } = renderPage();

    LoadingPageState.updateText("Downloading results...");
    expect(text).not.toHaveClass("hidden");
    expect(text).toHaveTextContent("Downloading results...");

    LoadingPageState.showError();
    expect(text).toHaveClass("hidden");
  });

  it("updateBar animates fill and resolves on complete", async () => {
    const { bar } = renderPage();

    await LoadingPageState.updateBar(42, 500);

    expect(mockAnimate).toHaveBeenLastCalledWith(
      bar.firstElementChild,
      expect.objectContaining({ width: "42%", duration: 500 }),
    );
  });
});
