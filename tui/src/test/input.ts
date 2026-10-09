import type { KeyEvent } from "@opentui/core";
import type { Config } from "@oxytype/schemas/configs";
import { keysToTrack } from "@oxytype/typing-core/events/helpers";
import type { KeydownEventData } from "@oxytype/typing-core/events/types";

export type InputAction =
  | { type: "insert"; text: string }
  | {
      type: "delete";
      inputType: "deleteContentBackward" | "deleteWordBackward";
    }
  | { type: "restart" }
  | { type: "repeat" }
  | { type: "finish" };

export function inputAction(
  event: KeyEvent,
  config: Config,
  words: readonly string[],
): InputAction | undefined {
  if (event.eventType !== "release") {
    if (event.ctrl && !event.meta && event.name === "r") {
      return { type: event.shift ? "repeat" : "restart" };
    }
    if (event.shift && event.name === "return" && !event.ctrl && !event.meta) {
      return { type: "finish" };
    }
    const restartKey = { off: "", tab: "tab", esc: "escape", enter: "return" }[
      config.quickRestart
    ];
    const literal =
      (event.name === "tab" && words.some((word) => word.includes("\t"))) ||
      (event.name === "return" &&
        (config.mode === "zen" || words.some((word) => word.includes("\n"))));
    if (
      !event.ctrl &&
      !event.meta &&
      event.name === restartKey &&
      (!literal || event.shift)
    ) {
      return { type: "restart" };
    }
  }
  if (event.name === "backspace" && !event.meta) {
    return {
      type: "delete",
      inputType: event.ctrl ? "deleteWordBackward" : "deleteContentBackward",
    };
  }
  if (event.ctrl || event.meta || event.super || event.hyper) return undefined;
  if (event.name === "space") return { type: "insert", text: " " };
  if (event.name === "return") return { type: "insert", text: "\n" };
  if (event.name === "tab" && words.some((word) => word.includes("\t"))) {
    return { type: "insert", text: "\t" };
  }
  if (
    event.sequence !== "" &&
    Array.from(event.sequence).every(
      (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
    )
  ) {
    return { type: "insert", text: event.sequence };
  }
  return undefined;
}

/** Raw terminal protocols have no release events or reliable physical key code. */
export function keyData(event: KeyEvent): KeydownEventData {
  const supplied = event.code as KeydownEventData["code"];
  const code =
    event.source === "kitty" && keysToTrack.has(supplied as "NoCode")
      ? supplied
      : "NoCode";
  return {
    code,
    ctrl: event.ctrl ? true : undefined,
    shift: event.shift ? true : undefined,
    alt: event.meta ? true : undefined,
  };
}
