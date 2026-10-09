import type { KeyEvent } from "@opentui/core";

import { createSignal, type Accessor } from "solid-js";

export type TextField = {
  value: Accessor<string>;
  /** In characters (code points). */
  cursor: Accessor<number>;
  set: (value: string, cursor?: number) => void;
  insert: (text: string) => void;
  /** Returns true when the key belonged to the field. */
  handleKey: (event: KeyEvent) => boolean;
};

function chars(value: string): string[] {
  return Array.from(value);
}

function wordStart(characters: string[], cursor: number): number {
  let index = cursor;
  while (index > 0 && /\s/.test(characters[index - 1] ?? "")) index--;
  while (index > 0 && !/\s/.test(characters[index - 1] ?? "")) index--;
  return index;
}

/** Single-line editing state driven by screen key handlers. */
export function createTextField(
  initial = "",
  options: { maxLength?: number } = {},
): TextField {
  const [value, setValue] = createSignal(initial);
  const [cursor, setCursor] = createSignal(chars(initial).length);
  function set(next: string, at?: number): void {
    const limited =
      options.maxLength === undefined
        ? next
        : chars(next).slice(0, options.maxLength).join("");
    const length = chars(limited).length;
    setValue(limited);
    setCursor(Math.max(0, Math.min(length, at ?? length)));
  }
  function splice(start: number, end: number, text: string): void {
    const current = chars(value());
    const inserted = chars(text.replace(/[\r\n\t]+/g, " "));
    set(
      [...current.slice(0, start), ...inserted, ...current.slice(end)].join(""),
      start + inserted.length,
    );
  }
  return {
    value,
    cursor,
    set,
    insert: (text) => splice(cursor(), cursor(), text),
    handleKey: (event) => {
      const current = chars(value());
      const at = cursor();
      if (event.eventType === "release") return false;
      if (
        (event.name === "backspace" && (event.ctrl || event.meta)) ||
        (event.ctrl && event.name === "w")
      ) {
        splice(wordStart(current, at), at, "");
      } else if (event.name === "backspace") {
        if (at > 0) splice(at - 1, at, "");
      } else if (
        event.name === "delete" ||
        (event.ctrl && event.name === "d")
      ) {
        splice(at, at + 1, "");
      } else if (event.ctrl && event.name === "u") {
        splice(0, at, "");
      } else if (event.name === "left" || (event.ctrl && event.name === "b")) {
        setCursor(Math.max(0, at - 1));
      } else if (event.name === "right" || (event.ctrl && event.name === "f")) {
        setCursor(Math.min(current.length, at + 1));
      } else if (event.name === "home" || (event.ctrl && event.name === "a")) {
        setCursor(0);
      } else if (event.name === "end" || (event.ctrl && event.name === "e")) {
        setCursor(current.length);
      } else if (
        !event.ctrl &&
        !event.meta &&
        (event.name === "space" ||
          (event.sequence !== "" &&
            Array.from(event.sequence).every(
              (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
            )))
      ) {
        splice(at, at, event.name === "space" ? " " : event.sequence);
      } else {
        return false;
      }
      event.preventDefault();
      return true;
    },
  };
}
