import type { KeyEvent } from "@opentui/core";

export type KeyBinding = {
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
};

type KeyState = Pick<KeyEvent, "name" | "ctrl" | "meta" | "shift">;

export function matchesKey(event: KeyState, binding: KeyBinding): boolean {
  return (
    event.name === binding.name &&
    event.ctrl === (binding.ctrl ?? false) &&
    event.meta === (binding.meta ?? false) &&
    event.shift === (binding.shift ?? false)
  );
}

/** Caret notation for plain ctrl chords keeps hint rows within 80 columns. */
export function formatKey(binding: KeyBinding): string {
  const name = binding.name === "escape" ? "esc" : binding.name;
  if (
    binding.ctrl === true &&
    binding.meta !== true &&
    binding.shift !== true
  ) {
    return `^${name}`;
  }
  return [
    binding.ctrl === true ? "ctrl" : undefined,
    binding.meta === true ? "alt" : undefined,
    binding.shift === true ? "shift" : undefined,
    name,
  ]
    .filter((it) => it !== undefined)
    .join("+");
}
