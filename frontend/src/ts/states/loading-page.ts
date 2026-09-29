import { createSignal } from "solid-js";

type LoadingPageMode = "spinner" | "error" | "bar";

type BarAnimation = {
  percentage: number;
  duration: number;
  onComplete: () => void;
};

const [getMode, setMode] = createSignal<LoadingPageMode>("spinner");
const [getText, setText] = createSignal("Loading...");
const [isTextVisible, setTextVisible] = createSignal(false);
const [getBarAnimation, setBarAnimation] = createSignal<BarAnimation>();

export { getMode, getText, isTextVisible, getBarAnimation };

export async function updateBar(
  percentage: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    setBarAnimation({ percentage, duration, onComplete: resolve });
  });
}

export function updateText(text: string): void {
  setTextVisible(true);
  setText(text);
}

export function showSpinner(): void {
  setMode("spinner");
  setTextVisible(false);
}

export function showError(): void {
  setMode("error");
  setTextVisible(false);
}

export async function showBar(): Promise<void> {
  setMode("bar");
  setTextVisible(false);
}
