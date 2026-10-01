import { createSignal } from "solid-js";

// "instant" hides without the fade (layoutfluid on test restart).
export type FunboxTimerVisibility = "shown" | "hidden" | "instant";

export const [getMemoryTimerText, setMemoryTimerText] = createSignal("");
export const [getMemoryTimerVisibility, setMemoryTimerVisibility] =
  createSignal<FunboxTimerVisibility>("hidden");

export const [getLayoutfluidTimerText, setLayoutfluidTimerText] =
  createSignal("");
export const [getLayoutfluidTimerVisibility, setLayoutfluidTimerVisibility] =
  createSignal<FunboxTimerVisibility>("hidden");
