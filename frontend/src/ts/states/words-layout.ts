import { createSignal, JSX } from "solid-js";
import { createEvent } from "../hooks/createEvent";

export const [getWordsWrapperHeight, setWordsWrapperHeight] = createSignal("");
export const [getWordsInputStyle, setWordsInputStyle] =
  createSignal<JSX.CSSProperties>({
    top: "0px",
    left: "0px",
    width: "",
    "max-width": "",
  });
export const centerWordsInputEvent = createEvent<boolean>();
