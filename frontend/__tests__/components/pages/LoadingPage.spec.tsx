import { cleanup, render } from "@solidjs/testing-library";
import { AnimationParams } from "animejs";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const { mockAnimate, motion } = vi.hoisted(() => ({
  motion: { reduced: false },
  mockAnimate: vi.fn((_el: HTMLElement, params: AnimationParams) => {
    // @ts-expect-error onComplete args not needed in test
    params.onComplete?.();
    return { cancel: vi.fn() };
  }),
}));

vi.mock("animejs", () => ({
  animate: mockAnimate,
}));
vi.mock("../../../src/ts/utils/misc", () => ({
  applyReducedMotion: (duration: number) => (motion.reduced ? 0 : duration),
}));

import { LoadingPage } from "../../../src/ts/components/pages/LoadingPage";
import * as LoadingPageState from "../../../src/ts/states/loading-page";

describe("LoadingPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    motion.reduced = false;
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
    expect(spinner).not.toHaveClass("invisible");
    expect(error).toHaveClass("invisible");
    expect(bar).toHaveClass("invisible");
    expect(text).toHaveClass("invisible");
    expect(text).toHaveTextContent("Loading...");
  });

  it("switches between error, bar and spinner", async () => {
    const { spinner, error, bar, text } = renderPage();

    LoadingPageState.showError();
    expect(spinner).toHaveClass("invisible");
    expect(error).not.toHaveClass("invisible");
    expect(bar).toHaveClass("invisible");

    await LoadingPageState.showBar();
    expect(error).toHaveClass("invisible");
    expect(bar).not.toHaveClass("invisible");

    LoadingPageState.showSpinner();
    expect(spinner).not.toHaveClass("invisible");
    expect(bar).toHaveClass("invisible");
    expect(text).toHaveClass("invisible");
  });

  it("updateText shows text, mode change hides it", () => {
    const { text } = renderPage();

    LoadingPageState.updateText("Downloading results...");
    expect(text).not.toHaveClass("invisible");
    expect(text).toHaveTextContent("Downloading results...");

    LoadingPageState.showError();
    expect(text).toHaveClass("invisible");
  });

  it("updateBar animates fill and resolves on complete", async () => {
    const { bar } = renderPage();

    await LoadingPageState.updateBar(42, 500);

    expect(mockAnimate).toHaveBeenLastCalledWith(
      bar.firstElementChild,
      expect.objectContaining({ scaleX: 0.42, duration: 500, ease: "linear" }),
    );
  });

  it("settles an unfinished keyframe when the component is disposed", async () => {
    const cancel = vi.fn();
    renderPage();
    mockAnimate.mockImplementationOnce(() => ({ cancel }));
    const pending = LoadingPageState.updateBar(90, 2000);
    cleanup();
    await pending;
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("starts a new bar at zero after leaving the previous load", async () => {
    const { bar } = renderPage();
    await LoadingPageState.showBar();
    await LoadingPageState.updateBar(90, 1000);
    LoadingPageState.showSpinner();
    await LoadingPageState.showBar();
    expect((bar.firstElementChild as HTMLElement).style.transform).toBe(
      "scaleX(0)",
    );
  });

  it("completes progress immediately with reduced motion", async () => {
    motion.reduced = true;
    const { bar } = renderPage();
    await LoadingPageState.updateBar(100, 1000);
    expect(mockAnimate).toHaveBeenLastCalledWith(
      bar.firstElementChild,
      expect.objectContaining({ scaleX: 1, duration: 0 }),
    );
  });

  it("announces loading status and failure details", () => {
    const { getByRole } = render(() => <LoadingPage />);
    expect(getByRole("status")).toHaveAccessibleName("Loading");
    LoadingPageState.showError();
    LoadingPageState.updateText("Could not download your results.");
    expect(getByRole("status")).toHaveAccessibleName("Loading failed");
    expect(getByRole("status")).toHaveTextContent(
      "Could not download your results.",
    );
  });
});
