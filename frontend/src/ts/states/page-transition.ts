import { createSignal } from "solid-js";

const [getTransition, setTransition] = createSignal(true);

export function set(val: boolean): void {
  setTransition(val);
}

export function get(): boolean {
  return getTransition();
}
