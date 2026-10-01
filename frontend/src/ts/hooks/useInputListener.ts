import { onCleanup } from "solid-js";

export function useInputListener<K extends keyof HTMLElementEventMap>(
  element: HTMLTextAreaElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
): void;
export function useInputListener(
  element: HTMLTextAreaElement,
  type: string,
  handler: (event: Event) => void,
): void;
export function useInputListener(
  element: HTMLTextAreaElement,
  type: string,
  handler: EventListener,
): void {
  element.addEventListener(type, handler);
  onCleanup(() => element.removeEventListener(type, handler));
}
