import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";

import { CustomBackground } from "../../../src/ts/components/core/CustomBackground";
import {
  setBackground,
  setBackgroundSize,
  setBackgroundStyle,
} from "../../../src/ts/states/background";

afterEach(() => {
  cleanup();
  setBackground({ url: "" });
  vi.restoreAllMocks();
});

it("replaces failed images on reapply and retains filter and size geometry", () => {
  const failed = vi.fn();
  window.addEventListener("customBackgroundFailed", failed);
  const { container } = render(() => <CustomBackground />);
  setBackgroundStyle({
    filter: "blur(2rem)",
    width: "calc(100% + 16rem)",
    top: "-8rem",
  });
  setBackgroundSize("contain");
  setBackground({ url: "https://example.com/background.png" });
  const image = container.querySelector("img");
  expect(image).toHaveStyle({
    filter: "blur(2rem)",
    width: "calc(100% + 16rem)",
    top: "-8rem",
    "object-fit": "contain",
  });
  fireEvent.error(image as HTMLImageElement);
  expect(image).toHaveClass("hidden");
  expect(failed).toHaveBeenCalledOnce();
  setBackground({ url: "https://example.com/background.png" });
  expect(container.querySelector("img")).not.toBe(image);
  expect(container.querySelector("img")).not.toHaveClass("hidden");
  setBackground({ url: "" });
  expect(container.querySelector("img")).toBeNull();
  window.removeEventListener("customBackgroundFailed", failed);
});
