import { centerWordsInputEvent } from "../states/words-layout";

export function useWordsInputScroll(
  wrapper: HTMLDivElement,
  input: HTMLTextAreaElement,
): void {
  centerWordsInputEvent.useListener((force) => {
    const windowHeight = window.innerHeight;
    if (wrapper.offsetHeight < windowHeight) return;
    if (!force && input.getBoundingClientRect().top <= windowHeight / 2) return;
    input.scrollIntoView({ block: "center" });
  });
}
