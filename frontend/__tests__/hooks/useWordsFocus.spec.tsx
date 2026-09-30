import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  setWarning: undefined as ((value: boolean) => void) | undefined,
}));
vi.mock("../../src/ts/states/test", async () => {
  const { createSignal } = await import("solid-js");
  const [showOutOfFocusWarning, setWarning] = createSignal(false);
  state.setWarning = setWarning;
  return { showOutOfFocusWarning };
});
import { useWordsFocus } from "../../src/ts/hooks/useWordsFocus";

afterEach(() => {
  cleanup();
  state.setWarning?.(false);
});

it("binds blur without replacing legacy classes, children or styles", () => {
  const element = document.createElement("div");
  element.className = "full-width tape joiningScript";
  element.innerHTML = "<div class='word'><letter>a</letter></div>";
  element.style.fontSize = "2rem";
  render(() => {
    useWordsFocus(element);
    return null;
  });
  element.className += " read_ahead_disabled";
  state.setWarning?.(true);
  expect(element).toHaveClass(
    "tape",
    "joiningScript",
    "read_ahead_disabled",
    "blurred",
    "opacity-25",
    "blur-[4px]",
  );
  expect(element.style.transition).toBe("0.25s");
  expect(element.style.fontSize).toBe("2rem");
  expect(element.querySelector("letter")?.textContent).toBe("a");
  state.setWarning?.(false);
  expect(element).not.toHaveClass("blurred", "opacity-25", "blur-[4px]");
  expect(element).toHaveClass("tape", "read_ahead_disabled");
  expect(element.style.transition).toBe("none");
});
