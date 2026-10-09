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

export function formatKey(binding: KeyBinding): string {
  return [
    binding.ctrl === true ? "ctrl" : undefined,
    binding.meta === true ? "alt" : undefined,
    binding.shift === true ? "shift" : undefined,
    binding.name === "escape" ? "esc" : binding.name,
  ]
    .filter((it) => it !== undefined)
    .join("+");
}
