import type { KeyEvent } from "@opentui/core";
import type { LayoutObject } from "@oxytype/schemas/layouts";
import { getCharFromLayout } from "@oxytype/typing-core/layout-emulator";
import { keyData } from "./input";

const baseRows = [
  "`1234567890-=",
  "qwertyuiop[]\\",
  "asdfghjkl;'",
  "zxcvbnm,./",
  " ",
];
const shiftRows = [
  "~!@#$%^&*()_+",
  "QWERTYUIOP{}|",
  'ASDFGHJKL:"',
  "ZXCVBNM<>?",
  " ",
];
const codes = [
  "Backquote",
  ...Array.from("1234567890", (it) => `Digit${it}`),
  "Minus",
  "Equal",
  ...Array.from("QWERTYUIOP", (it) => `Key${it}`),
  "BracketLeft",
  "BracketRight",
  "Backslash",
  ...Array.from("ASDFGHJKL", (it) => `Key${it}`),
  "Semicolon",
  "Quote",
  ...Array.from("ZXCVBNM", (it) => `Key${it}`),
  "Comma",
  "Period",
  "Slash",
  "Space",
];

/** Legacy terminals assume a QWERTY host; Kitty supplies physical key codes. */
export function emulateTerminalChar(
  event: KeyEvent,
  text: string,
  layout: LayoutObject,
): string | null {
  const bases = baseRows.join("");
  const shifts = shiftRows.join("");
  const index = bases.indexOf(text);
  const shifted = shifts.indexOf(text);
  const supplied = keyData(event).code;
  const code =
    supplied === "NoCode" ? codes[index >= 0 ? index : shifted] : supplied;
  if (code === undefined) return text;
  return getCharFromLayout(layout, {
    code,
    shift: event.shift || (index < 0 && shifted >= 0),
    altGr: event.option,
    capsLock: event.capsLock ?? false,
    key: text,
  });
}
