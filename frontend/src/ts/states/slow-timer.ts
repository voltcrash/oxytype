import { createSignal } from "solid-js";

const [getSlowTimer, setSlowTimer] = createSignal(false);

export function set(): void {
  if (getSlowTimer()) return;
  setSlowTimer(true);
  console.error("Slow timer, disabling animations");
}

export function clear(): void {
  setSlowTimer(false);
}

export function get(): boolean {
  return getSlowTimer();
}
