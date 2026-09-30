import { createSignal } from "solid-js";

export const [isAppLoading, setAppLoading] = createSignal(true);
export const [getFontFamily, setFontFamily] = createSignal<string>();
export const [getFontFace, setFontFace] = createSignal("");
export const [getMediaQueryDebugLevel, setMediaQueryDebugLevel] =
  createSignal(0);
