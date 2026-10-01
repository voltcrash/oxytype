import { createSignal } from "solid-js";

const [getComposingState, setComposingState] = createSignal(false);
const [getCompositionData, setCompositionData] = createSignal("");

export function getComposing(): boolean {
  return getComposingState();
}

export function setComposing(isComposing: boolean): void {
  setComposingState(isComposing);
}

export function setData(data: string): void {
  setCompositionData(data);
}

export function getData(): string {
  return getCompositionData();
}
