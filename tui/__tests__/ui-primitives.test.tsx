import { describe, expect, test } from "bun:test";
import { createRoot, createSignal } from "solid-js";

import { createSelection, listWindow } from "../src/ui/selection";
import { createTextField } from "../src/ui/text-field";
import { key } from "./helpers/typing-test";

describe("text field", () => {
  test("edits at the cursor", () => {
    createRoot((dispose) => {
      const field = createTextField("helo");
      field.handleKey(key("left"));
      expect(field.handleKey(key("l"))).toBe(true);
      expect(field.value()).toBe("hello");
      field.handleKey(key("end"));
      field.handleKey(key("space"));
      field.insert("wor\nld");
      expect(field.value()).toBe("hello wor ld");
      field.handleKey(key("backspace", { ctrl: true }));
      expect(field.value()).toBe("hello wor ");
      field.handleKey(key("backspace", { ctrl: true }));
      expect(field.value()).toBe("hello ");
      field.handleKey(key("home"));
      field.handleKey(key("delete"));
      expect(field.value()).toBe("ello ");
      field.handleKey(key("end"));
      field.handleKey(key("u", { ctrl: true }));
      expect(field.value()).toBe("");
      expect(field.handleKey(key("f2"))).toBe(false);
      dispose();
    });
  });

  test("limits length and handles multi-unit characters", () => {
    createRoot((dispose) => {
      const field = createTextField("", { maxLength: 3 });
      field.insert("😀ab");
      field.insert("c");
      expect(field.value()).toBe("😀ab");
      field.handleKey(key("backspace"));
      expect(field.value()).toBe("😀a");
      expect(field.cursor()).toBe(2);
      dispose();
    });
  });
});

describe("selection", () => {
  test("moves, wraps and clamps", () => {
    createRoot((dispose) => {
      const [count, setCount] = createSignal(5);
      const selection = createSelection(count, { wrap: true });
      selection.handleKey(key("up"));
      expect(selection.index()).toBe(4);
      selection.handleKey(key("n", { ctrl: true }));
      expect(selection.index()).toBe(0);
      selection.handleKey(key("pagedown"));
      expect(selection.index()).toBe(4);
      setCount(2);
      expect(selection.index()).toBe(1);
      dispose();
    });
  });

  test("keeps the selection inside the window", () => {
    expect(listWindow(100, 0, 10)).toEqual({ start: 0, end: 10 });
    expect(listWindow(100, 50, 10)).toEqual({ start: 45, end: 55 });
    expect(listWindow(100, 99, 10)).toEqual({ start: 90, end: 100 });
    expect(listWindow(3, 2, 10)).toEqual({ start: 0, end: 3 });
  });
});
