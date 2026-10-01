import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  restart: vi.fn(),
  retrySavingResult: vi.fn(),
  download: vi.fn(),
  copyToClipboard: vi.fn(),
  toggleReplayDisplay: vi.fn(),
  toggleResultWords: vi.fn(),
  showModal: vi.fn(),
  showNoticeNotification: vi.fn(),
}));

vi.mock("../../../../../src/ts/test/test-logic", () => ({
  restart: mocks.restart,
  retrySavingResult: mocks.retrySavingResult,
}));
vi.mock("../../../../../src/ts/test/test-screenshot", () => ({
  download: mocks.download,
  copyToClipboard: mocks.copyToClipboard,
}));
vi.mock("../../../../../src/ts/test/replay", () => ({
  toggleReplayDisplay: mocks.toggleReplayDisplay,
}));
vi.mock("../../../../../src/ts/test/result", () => ({
  toggleResultWords: mocks.toggleResultWords,
}));
vi.mock("../../../../../src/ts/states/modals", () => ({
  showModal: mocks.showModal,
}));
vi.mock("../../../../../src/ts/states/notifications", () => ({
  showNoticeNotification: mocks.showNoticeNotification,
}));
vi.mock("../../../../../src/ts/states/test", () => ({
  getResultVisible: () => true,
}));
vi.mock("../../../../../src/ts/states/core", async () => {
  const { createSignal } = await import("solid-js");
  const [getIsScreenshotting, setIsScreenshotting] = createSignal(false);
  return {
    getActivePage: () => "test",
    getIsScreenshotting,
    setIsScreenshotting,
  };
});

import { ResultButtons } from "../../../../../src/ts/components/pages/test/result/ResultButtons";
import { setConfigStore } from "../../../../../src/ts/config/store";
import { setIsScreenshotting } from "../../../../../src/ts/states/core";
import { setResultState } from "../../../../../src/ts/states/result";

function renderButtons(): HTMLElement {
  return render(() => <ResultButtons />).container;
}

const byId = (c: HTMLElement, id: string): HTMLElement =>
  c.querySelector(`#${id}`) as HTMLElement;

describe("ResultButtons", () => {
  beforeEach(() => {
    setConfigStore("mode", "words");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    setResultState({ retrySaving: false, noStress: false });
  });

  it("renders the buttons in tab order", () => {
    const c = renderButtons();
    expect(
      [...c.querySelectorAll(".buttons button")].map((b) => [
        b.id,
        b.getAttribute("aria-label"),
      ]),
    ).toEqual([
      ["nextTestButton", "Next test"],
      ["restartTestButtonWithSameWordset", "Repeat test"],
      ["practiseWordsButton", "Practice words"],
      ["showWordHistoryButton", "Toggle words history"],
      ["watchReplayButton", "Watch replay"],
      [
        "saveScreenshotButton",
        "Copy screenshot to clipboard\n(shift click to download)",
      ],
    ]);
    expect(byId(c, "saveScreenshotButton")).toHaveAttribute(
      "data-balloon-break",
    );
  });

  it("wires the button actions", () => {
    const c = renderButtons();
    fireEvent.click(byId(c, "nextTestButton"));
    expect(mocks.restart).toHaveBeenCalledWith();
    fireEvent.click(byId(c, "restartTestButtonWithSameWordset"));
    expect(mocks.restart).toHaveBeenCalledWith({ withSameWordset: true });
    fireEvent.click(byId(c, "practiseWordsButton"));
    expect(mocks.showModal).toHaveBeenCalledWith("PractiseWords");
    fireEvent.click(byId(c, "showWordHistoryButton"));
    expect(mocks.toggleResultWords).toHaveBeenCalled();
    fireEvent.click(byId(c, "watchReplayButton"));
    expect(mocks.toggleReplayDisplay).toHaveBeenCalled();
    fireEvent.click(byId(c, "saveScreenshotButton"));
    expect(mocks.copyToClipboard).toHaveBeenCalled();
    fireEvent.click(byId(c, "saveScreenshotButton"), { shiftKey: true });
    expect(mocks.download).toHaveBeenCalled();
  });

  it("blocks repeat and practice in zen mode", () => {
    setConfigStore("mode", "zen");
    const c = renderButtons();
    fireEvent.click(byId(c, "restartTestButtonWithSameWordset"));
    fireEvent.click(byId(c, "practiseWordsButton"));
    expect(mocks.restart).not.toHaveBeenCalled();
    expect(mocks.showModal).not.toHaveBeenCalled();
    expect(mocks.showNoticeNotification).toHaveBeenCalledTimes(2);
  });

  it("hides history, replay and screenshot in glarses mode", () => {
    const c = renderButtons();
    setResultState("noStress", true);
    const hidden = [...c.querySelectorAll(".buttons button.hidden")].map(
      (b) => b.id,
    );
    expect(hidden).toEqual([
      "showWordHistoryButton",
      "watchReplayButton",
      "saveScreenshotButton",
    ]);
  });

  it("shows the download icon while shift is held", () => {
    const c = renderButtons();
    const icon = (): Element | null =>
      byId(c, "saveScreenshotButton").querySelector("i");
    expect(icon()).toHaveClass("far", "fa-image");
    fireEvent.keyDown(document, { key: "Shift" });
    expect(icon()).toHaveClass("fas", "fa-download");
    fireEvent.keyUp(document, { key: "Shift" });
    expect(icon()).toHaveClass("far", "fa-image");
  });

  it("hides the buttons while screenshotting", () => {
    const c = renderButtons();
    expect(c.querySelector(".buttons")).not.toHaveClass("hidden");
    setIsScreenshotting(true);
    expect(c.querySelector(".buttons")).toHaveClass("hidden");
    setIsScreenshotting(false);
  });

  it("shows retry saving from the store", () => {
    const c = renderButtons();
    expect(byId(c, "retrySavingResultButton")).toBeNull();
    setResultState("retrySaving", true);
    fireEvent.click(byId(c, "retrySavingResultButton"));
    expect(mocks.retrySavingResult).toHaveBeenCalled();
  });
});
