import { ElementWithUtils } from "../utils/dom";

type TestElements = {
  words: HTMLDivElement;
  wordsWrapper: HTMLDivElement;
  wordsInput: HTMLTextAreaElement;
  caret: HTMLDivElement;
  paceCaret: HTMLDivElement;
  typingTest: HTMLDivElement;
};

type WrappedElements = {
  [K in keyof TestElements]: ElementWithUtils<TestElements[K]>;
};

let elements: WrappedElements | undefined;

// TestPage owns the nodes; legacy consumers retain their DOM utility API.
export function setTestElements(refs: TestElements): void {
  elements = {
    words: new ElementWithUtils(refs.words),
    wordsWrapper: new ElementWithUtils(refs.wordsWrapper),
    wordsInput: new ElementWithUtils(refs.wordsInput),
    caret: new ElementWithUtils(refs.caret),
    paceCaret: new ElementWithUtils(refs.paceCaret),
    typingTest: new ElementWithUtils(refs.typingTest),
  };
}

export function areTestElementsMounted(): boolean {
  return elements !== undefined;
}

function getElement<K extends keyof TestElements>(key: K): WrappedElements[K] {
  if (elements === undefined) throw new Error("Test page is not mounted");
  return elements[key];
}

export const getWordsElement = (): ElementWithUtils<HTMLDivElement> =>
  getElement("words");
export const getWordsWrapperElement = (): ElementWithUtils<HTMLDivElement> =>
  getElement("wordsWrapper");
export const getWordsInputElement = (): ElementWithUtils<HTMLTextAreaElement> =>
  getElement("wordsInput");
export const getCaretElement = (): ElementWithUtils<HTMLDivElement> =>
  getElement("caret");
export const getPaceCaretElement = (): ElementWithUtils<HTMLDivElement> =>
  getElement("paceCaret");
export const getTypingTestElement = (): ElementWithUtils<HTMLDivElement> =>
  getElement("typingTest");
