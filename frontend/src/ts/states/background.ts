import { createSignal, JSX } from "solid-js";

export const [getBackground, setBackground] = createSignal({ url: "" });
export const [getBackgroundStyle, setBackgroundStyle] =
  createSignal<JSX.CSSProperties>({});
export const [getBackgroundSize, setBackgroundSize] = createSignal<
  "" | "cover" | "contain"
>("");
