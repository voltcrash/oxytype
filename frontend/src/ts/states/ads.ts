import { createSignal } from "solid-js";
import { createEvent } from "../hooks/createEvent";

export const removeAdSlots = createEvent<string[]>();
export const [getShellAdsVisible, setShellAdsVisible] = createSignal(true);
export const [getAdMessage, setAdMessage] = createSignal<
  "adblock" | "cookies"
>();
export const [getAdWithLeft, setAdWithLeft] = createSignal(false);
const slots = new Map<string, HTMLElement>();
export function registerAdSlot(id: string, element: HTMLElement): () => void {
  slots.set(id, element);
  return () => {
    if (slots.get(id) === element) slots.delete(id);
  };
}
export function getAdSlot(id: string): HTMLElement | undefined {
  return slots.get(id);
}
