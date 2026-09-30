import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => () => <div data-stub={name} />,
}));
vi.mock(
  "../../../../../src/ts/components/pages/test/result/ResultStats",
  () => ({
    ResultStats: stub("stats"),
  }),
);
vi.mock(
  "../../../../../src/ts/components/pages/test/result/ResultChart",
  () => ({
    ResultChart: stub("chart"),
  }),
);
vi.mock(
  "../../../../../src/ts/components/pages/test/result/ResultWordsHistory",
  () => ({ ResultWordsHistory: stub("history") }),
);
vi.mock(
  "../../../../../src/ts/components/pages/test/result/ResultReplay",
  () => ({
    ResultReplay: stub("replay"),
  }),
);
vi.mock(
  "../../../../../src/ts/components/pages/test/result/ResultButtons",
  () => ({
    ResultButtons: stub("buttons"),
  }),
);
vi.mock(
  "../../../../../src/ts/components/pages/test/result/ResultLoginTip",
  () => ({
    ResultLoginTip: stub("logintip"),
  }),
);
vi.mock(
  "../../../../../src/ts/components/pages/test/result/ResultWatermark",
  () => ({
    ResultWatermark: stub("watermark"),
  }),
);
vi.mock("../../../../../src/ts/components/common/Advertisement", () => ({
  Advertisement: stub("ad"),
}));

import { Result } from "../../../../../src/ts/components/pages/test/result/Result";
import {
  getResultElement,
  getResultWrapperElement,
  setResultState,
} from "../../../../../src/ts/states/result";

describe("Result", () => {
  afterEach(() => {
    cleanup();
    setResultState("noStress", false);
  });

  it("renders the result layout and exposes its elements", () => {
    const { container } = render(() => <Result />);
    const result = container.querySelector("#result");
    expect(result).toHaveClass("hidden");
    expect(result).toHaveAttribute("tabindex", "-1");
    expect(getResultElement()).toBe(result);
    expect(getResultWrapperElement()).toBe(result?.querySelector(".wrapper"));
    expect(
      [...container.querySelectorAll("[data-stub]")].map((e) =>
        e.getAttribute("data-stub"),
      ),
    ).toEqual([
      "stats",
      "chart",
      "history",
      "replay",
      "buttons",
      "logintip",
      "watermark",
      "ad",
    ]);
    expect(
      container.querySelector(".bottom [data-stub=history]"),
    ).not.toBeNull();
  });

  it("shows the glarses mode check mark", () => {
    const { container } = render(() => <Result />);
    expect(container.querySelector(".noStressMessage")).toBeNull();
    setResultState("noStress", true);
    const message = container.querySelector("#result > .noStressMessage");
    expect(message?.querySelector("i")).toHaveClass("fa-check");
  });
});
