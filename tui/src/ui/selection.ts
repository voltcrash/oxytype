import type { KeyEvent } from "@opentui/core";

import { createSignal, type Accessor } from "solid-js";

export type Selection = {
  index: Accessor<number>;
  set: (index: number) => void;
  move: (step: number) => void;
  /** Up/down, page, home/end, ctrl+n/p and ctrl+j/k. */
  handleKey: (event: KeyEvent) => boolean;
};

/** A clamped (or wrapping) cursor over a list of `count` items. */
export function createSelection(
  count: Accessor<number>,
  options: { wrap?: boolean; page?: Accessor<number> } = {},
): Selection {
  const [raw, setIndex] = createSignal(0);
  const clamp = (value: number): number =>
    Math.max(0, Math.min(Math.max(0, count() - 1), value));
  // Clamped on read, so shrinking lists never select a missing item.
  const index = (): number => clamp(raw());
  function move(step: number): void {
    const total = count();
    if (total === 0) return;
    if (options.wrap === true && Math.abs(step) === 1) {
      setIndex((index() + step + total) % total);
    } else {
      setIndex(clamp(index() + step));
    }
  }
  return {
    index,
    set: (value) => setIndex(clamp(value)),
    move,
    handleKey: (event) => {
      if (event.eventType === "release") return false;
      const page = options.page?.() ?? 10;
      if (
        event.name === "up" ||
        (event.ctrl && (event.name === "p" || event.name === "k"))
      ) {
        move(-1);
      } else if (
        event.name === "down" ||
        (event.ctrl && (event.name === "n" || event.name === "j"))
      ) {
        move(1);
      } else if (event.name === "pageup") {
        move(-page);
      } else if (event.name === "pagedown") {
        move(page);
      } else if (event.name === "home" && !event.shift) {
        setIndex(0);
      } else if (event.name === "end" && !event.shift) {
        setIndex(clamp(count() - 1));
      } else {
        return false;
      }
      event.preventDefault();
      return true;
    },
  };
}

/** The visible slice of a list that keeps `selected` in view. */
export function listWindow(
  total: number,
  selected: number,
  height: number,
): { start: number; end: number } {
  const size = Math.max(1, height);
  const start = Math.max(
    0,
    Math.min(selected - Math.floor(size / 2), total - size),
  );
  return { start, end: Math.min(total, start + size) };
}
