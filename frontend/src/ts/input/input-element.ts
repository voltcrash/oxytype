let el: HTMLTextAreaElement | undefined;

export function getInputElement(): HTMLTextAreaElement {
  el ??=
    document.querySelector<HTMLTextAreaElement>("#wordsInput") ?? undefined;
  if (el === undefined) throw new Error("Words input element not found");
  return el;
}

export function setInputElementValue(value: string): void {
  getInputElement().value = ` ${value}`;
}

export function appendToInputElementValue(value: string): void {
  getInputElement().value += value;
}

export function getInputElementValue(): {
  inputValue: string;
  realInputValue: string;
} {
  return {
    inputValue: getInputElement().value.slice(1),
    realInputValue: getInputElement().value,
  };
}

export function moveInputElementCaretToTheEnd(): void {
  getInputElement().setSelectionRange(
    getInputElement().value.length,
    getInputElement().value.length,
  );
}

export function replaceInputElementLastValueChar(char: string): void {
  const { inputValue } = getInputElementValue();
  setInputElementValue(inputValue.slice(0, -1) + char);
}

export function isInputElementFocused(): boolean {
  return document.activeElement === getInputElement();
}

export function focusInputElement(preventScroll = false): void {
  getInputElement().focus({
    preventScroll,
  });
}

export function blurInputElement(): void {
  getInputElement().blur();
}
