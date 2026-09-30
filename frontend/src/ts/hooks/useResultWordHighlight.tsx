// Highlights the words typed at the hovered result chart second in the words
// history. Each line of text gets an absolutely positioned, overflow hidden
// "highlightContainer", a ".highlight" moves inside it on top of the words.

import {
  Accessor,
  batch,
  createSignal,
  For,
  JSXElement,
  onCleanup,
  onMount,
} from "solid-js";

import { resultState, resultWordHighlightEvent } from "../states/result";
import { isLanguageRightToLeft } from "../states/test";
import { cn } from "../utils/cn";
import { getBoundingRectOfElements } from "../utils/misc";
import { createEffectOn } from "./effects";

const PADDING_X = 16;
const PADDING_Y = 12;
const PADDING_OFFSET_X = PADDING_X / 2;
const PADDING_OFFSET_Y = PADDING_Y / 2;
const TOGGLE_RESULT_WORDS_BUFFER = 250;

// a line of text in the words history
type Line = {
  rect: DOMRect;
  firstWordIndex: number;
  lastWordIndex: number;
  // % relative to the words history element
  container: { top: string; left: string; width: string; height: string };
  // px relative to the highlight container
  inputWordsContainer: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  inputWords: {
    // index into inputWordEls
    index: number;
    left: number;
    text: string;
  }[];
};

type HighlightPosition = {
  highlightLeft: number;
  highlightRight: number;
  inputContainerLeft: number;
  inputContainerRight: number;
};

function px(value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${value}px`;
}

export function useResultWordHighlight(
  wordsHistoryElement: Accessor<HTMLElement | undefined>,
): {
  component: () => JSXElement;
  destroy: () => void;
} {
  const [lines, setLines] = createSignal<Line[]>([]);
  const [positions, setPositions] = createSignal<HighlightPosition[]>([]);
  const [hidden, setHidden] = createSignal(true);
  const [animate, setAnimate] = createSignal(false);

  // collection of all word elements
  let wordEls: HTMLElement[] = [];
  // word index -> line index
  let wordIndexToLineIndexDict: Record<number, number> = {};
  let highlightContainerEls: HTMLElement[] = [];
  let inputWordsContainerEls: HTMLElement[] = [];
  // user inputs aligned with .word elements
  let inputWordEls: HTMLElement[] = [];
  // range of currently highlighted words
  let highlightRange: number[] = [];
  // last time the words history was toggled
  let lastToggleWordsHistoryTime = new Date();

  let isInitialized = false;
  let isHoveringChart = false;
  let isFirstHighlightSinceInit = true;
  let isFirstHighlightSinceClear = true;
  let isInitInProgress = false;

  // Highlights .word elements in range [firstWordIndex, lastWordIndex]
  async function highlightWordsInRange(
    firstWordIndex: number,
    lastWordIndex: number,
  ): Promise<boolean> {
    if (!isHoveringChart) {
      return false;
    }

    if (
      firstWordIndex === highlightRange?.[0] &&
      lastWordIndex === highlightRange[1]
    ) {
      return false;
    }

    if (!isInitialized) {
      // awaiting also lets the new highlight elements render
      const initResponse = await init();
      if (!initResponse) {
        return false;
      }
    }

    if (
      firstWordIndex === undefined ||
      lastWordIndex === undefined ||
      firstWordIndex < 0 ||
      lastWordIndex < 0 ||
      lastWordIndex < firstWordIndex
    ) {
      return false;
    }

    lastWordIndex = Math.min(lastWordIndex, wordEls.length - 1);

    const newPositions = getHighlightElementPositions(
      firstWordIndex,
      lastWordIndex,
      isLanguageRightToLeft(),
    );

    batch(() => {
      setHidden(false);
      // make highlight appear instantly for first highlight
      setAnimate(!isFirstHighlightSinceInit && !isFirstHighlightSinceClear);
      setPositions(newPositions);
    });

    isFirstHighlightSinceInit = false;
    isFirstHighlightSinceClear = false;
    highlightRange = [firstWordIndex, lastWordIndex];
    return true;
  }

  function clear(): void {
    setHidden(true);
    isFirstHighlightSinceClear = true;
    highlightRange = [];
  }

  function destroy(): void {
    if (!isInitialized) return;

    batch(() => {
      setLines([]);
      setPositions([]);
      setHidden(true);
      setAnimate(false);
    });

    highlightContainerEls = [];
    wordIndexToLineIndexDict = {};
    inputWordsContainerEls = [];
    inputWordEls = [];
    isInitialized = false;
    isFirstHighlightSinceInit = true;
    isFirstHighlightSinceClear = true;
    highlightRange = [];
  }

  async function init(): Promise<boolean> {
    if (isInitialized || isInitInProgress) {
      return false;
    }

    isInitInProgress = true;

    // wait for the words history to finish sliding before measuring
    const TIME_DIFF_SINCE_LAST_TOGGLE =
      new Date().getTime() - lastToggleWordsHistoryTime.getTime();
    if (TIME_DIFF_SINCE_LAST_TOGGLE < TOGGLE_RESULT_WORDS_BUFFER) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          TOGGLE_RESULT_WORDS_BUFFER - TIME_DIFF_SINCE_LAST_TOGGLE,
        ),
      );
    }

    const RWH_el = wordsHistoryElement();
    if (RWH_el === undefined) {
      isInitInProgress = false;
      return false;
    }
    const RWH_rect = RWH_el.getBoundingClientRect();
    wordEls = [...RWH_el.querySelectorAll<HTMLElement>(".words .word[input]")];

    if (wordEls.length === 0) {
      isInitInProgress = false;
      return false;
    }

    const measuredLines: Pick<
      Line,
      "rect" | "firstWordIndex" | "lastWordIndex"
    >[] = [];
    let prevLineEndWordIndex = -1;
    let currLineIndex = 0;

    wordIndexToLineIndexDict[0] = 0;
    for (let i = 1; i < wordEls.length; i++) {
      const word = wordEls[i] as HTMLElement;
      const prevWord = wordEls[i - 1] as HTMLElement;

      if (word.offsetTop !== prevWord.offsetTop) {
        currLineIndex++;
        measuredLines.push({
          firstWordIndex: prevLineEndWordIndex + 1,
          lastWordIndex: i - 1,
          rect: getBoundingRectOfElements([
            wordEls[prevLineEndWordIndex + 1] as HTMLElement,
            prevWord,
          ]),
        });
        prevLineEndWordIndex = i - 1;
      }
      wordIndexToLineIndexDict[i] = currLineIndex;
    }

    measuredLines.push({
      firstWordIndex: prevLineEndWordIndex + 1,
      lastWordIndex: wordEls.length - 1,
      rect: getBoundingRectOfElements([
        wordEls[prevLineEndWordIndex + 1] as HTMLElement,
        wordEls[wordEls.length - 1] as HTMLElement,
      ]),
    });

    const RWH_width = RWH_rect.width;
    const RWH_height = RWH_rect.height;
    const isRTL = isLanguageRightToLeft();
    let inputWordIndex = 0;

    const newLines: Line[] = measuredLines.map((line) => {
      const HC_rect_top = line.rect.top - PADDING_OFFSET_Y;
      const HC_rect_left = line.rect.left - PADDING_OFFSET_X;
      const HC_rel_top = HC_rect_top - RWH_rect.top;
      const HC_rel_left = HC_rect_left - RWH_rect.left;
      const HC_width = line.rect.width + PADDING_X;
      const HC_height = line.rect.height + PADDING_Y;

      // for RTL languages, account for difference between highlightContainer left and RWH_el left
      const RTL_offset = isRTL ? line.rect.left - RWH_rect.left + PADDING_X : 0;

      const inputWords: Line["inputWords"] = [];
      for (let i = line.firstWordIndex; i <= line.lastWordIndex; i += 1) {
        const wordEl = wordEls[i] as HTMLElement;
        const userInputString = wordEl.getAttribute("input") ?? "";

        if (!userInputString) {
          continue;
        }

        inputWords.push({
          index: inputWordIndex++,
          left: wordEl.offsetLeft + PADDING_OFFSET_X - RTL_offset,
          text: userInputString
            .replace(/\t/g, "_")
            .replace(/\n/g, "_")
            .slice(0, wordEl.childElementCount),
        });
      }

      return {
        ...line,
        container: {
          top: `${(HC_rel_top / RWH_height) * 100}%`,
          left: `${(HC_rel_left / RWH_width) * 100}%`,
          width: `${(HC_width / RWH_width) * 100}%`,
          height: `${(HC_height / RWH_height) * 100}%`,
        },
        inputWordsContainer: {
          top: line.rect.top - HC_rect_top,
          left: line.rect.left - HC_rect_left,
          width: line.rect.width,
          height: line.rect.height,
        },
        inputWords,
      };
    });

    setLines(newLines);

    isInitialized = true;
    isInitInProgress = false;
    return true;
  }

  function getHighlightElementPositions(
    firstWordIndex: number,
    lastWordIndex: number,
    isRTL = false,
  ): HighlightPosition[] {
    const currentLines = lines();
    const lineIndexOfFirstWord = wordIndexToLineIndexDict[
      firstWordIndex
    ] as number;
    const highlightPositions = new Array(currentLines.length)
      .fill(null)
      .map(() => ({
        highlightLeft: 0,
        highlightRight: 0,
        inputContainerLeft: 0,
        inputContainerRight: 0,
      })) as HighlightPosition[];

    const highlightWidth: number = getHighlightWidth(
      firstWordIndex,
      lastWordIndex,
    );

    const firstWordEl = wordEls[firstWordIndex];
    const line = currentLines[lineIndexOfFirstWord];
    const linePos = highlightPositions[lineIndexOfFirstWord];
    const container = highlightContainerEls[lineIndexOfFirstWord];
    const inputContainer = inputWordsContainerEls[lineIndexOfFirstWord];

    if (
      firstWordEl === undefined ||
      line === undefined ||
      linePos === undefined ||
      container === undefined ||
      inputContainer === undefined
    ) {
      return highlightPositions;
    }

    // origin for line highlight starts at
    if (!isRTL) {
      linePos.highlightLeft = firstWordEl.offsetLeft;
      linePos.highlightRight =
        line.rect.width - (linePos.highlightLeft + highlightWidth) + PADDING_X;
    } else {
      const offsetLeftOfHighlightContainer = container.offsetLeft;

      linePos.highlightRight =
        line.rect.width -
        (firstWordEl.offsetLeft + firstWordEl.offsetWidth) +
        offsetLeftOfHighlightContainer +
        PADDING_OFFSET_X;

      linePos.highlightLeft =
        line.rect.width - (linePos.highlightRight + highlightWidth) + PADDING_X;
    }

    if (!isRTL) {
      linePos.inputContainerLeft = -1 * linePos.highlightLeft;
    } else {
      linePos.inputContainerLeft =
        -1 *
        (inputContainer.getBoundingClientRect().width -
          highlightWidth -
          linePos.highlightRight);
    }

    // offsets for lines above, going from zero to lineIndexOfWord
    for (let i = lineIndexOfFirstWord - 1; i >= 0; i--) {
      const position = highlightPositions[i];
      const nextPosition = highlightPositions[i + 1];
      const line = currentLines[i];
      const container = inputWordsContainerEls[i];
      if (
        position === undefined ||
        line === undefined ||
        nextPosition === undefined ||
        container === undefined
      ) {
        continue;
      }

      if (!isRTL) {
        position.highlightLeft =
          nextPosition.highlightLeft + line.rect.width + PADDING_X;

        position.highlightRight =
          line.rect.width -
          (position.highlightLeft + highlightWidth) +
          PADDING_X;

        position.inputContainerLeft = -1 * position.highlightLeft;
      } else {
        position.highlightRight =
          nextPosition.highlightRight + line.rect.width + PADDING_X;

        position.highlightLeft =
          line.rect.width -
          (position.highlightRight + highlightWidth) +
          PADDING_X;

        position.inputContainerLeft =
          -1 *
          (container.getBoundingClientRect().width -
            highlightWidth -
            position.highlightRight);
      }
    }

    // offsets for lines below, going from lineIndexOfWord to lines.length
    for (let i = lineIndexOfFirstWord + 1; i < currentLines.length; i++) {
      const position = highlightPositions[i];
      const previousLine = currentLines[i - 1];
      const line = currentLines[i];
      const prevHighlightPosition = highlightPositions[i - 1];
      const container = inputWordsContainerEls[i];

      if (
        position === undefined ||
        previousLine === undefined ||
        line === undefined ||
        prevHighlightPosition === undefined ||
        container === undefined
      ) {
        continue;
      }

      if (!isRTL) {
        position.highlightLeft =
          -1 *
          (previousLine.rect.width -
            prevHighlightPosition.highlightLeft +
            PADDING_X);

        position.highlightRight =
          line.rect.width -
          (position.highlightLeft + highlightWidth) +
          PADDING_X;

        position.inputContainerLeft = -1 * position.highlightLeft;
      } else {
        position.highlightRight =
          -1 *
          (previousLine.rect.width -
            prevHighlightPosition.highlightRight +
            PADDING_X);

        position.highlightLeft =
          line.rect.width -
          (position.highlightRight + highlightWidth) +
          PADDING_X;

        position.inputContainerLeft =
          -1 *
          (container.getBoundingClientRect().width -
            highlightWidth -
            position.highlightRight);
      }
    }

    return highlightPositions;
  }

  // width of the highlight for a given range of words
  function getHighlightWidth(
    wordStartIndex: number,
    wordEndIndex: number,
  ): number {
    const currentLines = lines();
    const lineIndexOfWordStart = wordIndexToLineIndexDict[wordStartIndex];
    const lineIndexOfWordEnd = wordIndexToLineIndexDict[wordEndIndex];

    if (
      lineIndexOfWordStart === undefined ||
      lineIndexOfWordEnd === undefined
    ) {
      return 0;
    }

    const startWord = wordEls[wordStartIndex];
    const endWord = wordEls[wordEndIndex];
    const inputEndWord = inputWordEls[wordEndIndex];
    const startLineLastWord =
      wordEls[currentLines[lineIndexOfWordStart]?.lastWordIndex ?? -1];
    const endLineFirstWord =
      wordEls[currentLines[lineIndexOfWordEnd]?.firstWordIndex ?? -1];

    if (
      startWord === undefined ||
      endWord === undefined ||
      inputEndWord === undefined ||
      startLineLastWord === undefined ||
      endLineFirstWord === undefined
    ) {
      return 0;
    }

    // highlight is just one line
    if (lineIndexOfWordStart === lineIndexOfWordEnd) {
      const highlightRect = getBoundingRectOfElements([startWord, endWord]);
      const lastWordElRect = endWord.getBoundingClientRect();

      const lastInputWordElRect = inputEndWord.getBoundingClientRect();
      let width = highlightRect.width + PADDING_X;
      width -= lastWordElRect.width - lastInputWordElRect.width;
      return width;
    }

    // multiple lines
    const firstLineBounds = getBoundingRectOfElements([
      startWord,
      startLineLastWord,
    ]);

    const lastLineBounds = getBoundingRectOfElements([
      endLineFirstWord,
      endWord,
    ]);

    let width = firstLineBounds.width + lastLineBounds.width;

    // middle line highlights
    for (let i = lineIndexOfWordStart + 1; i < lineIndexOfWordEnd; i++) {
      width += (currentLines[i] as Line).rect.width;
    }

    // padding
    width += 2 * PADDING_X * (lineIndexOfWordEnd - lineIndexOfWordStart);

    // difference between last wordEl and last inputWordEl
    const lastWordElRect = endWord.getBoundingClientRect();
    const lastInputWordElRect = inputEndWord.getBoundingClientRect();
    width -= lastWordElRect.width - lastInputWordElRect.width;
    return width;
  }

  resultWordHighlightEvent.useListener((event) => {
    if (event.type === "highlight") {
      void highlightWordsInRange(event.firstWordIndex, event.lastWordIndex);
    } else {
      isHoveringChart = event.hovering;
      if (!event.hovering) clear();
    }
  });

  createEffectOn(
    () => resultState.wordsHistory.visible,
    () => {
      lastToggleWordsHistoryTime = new Date();
    },
    { defer: true },
  );

  // new result, measured words are gone
  createEffectOn(() => resultState.wordsHistory.items, destroy, {
    defer: true,
  });

  onMount(() => {
    addEventListener("resize", destroy);
  });
  onCleanup(() => {
    removeEventListener("resize", destroy);
  });

  function component(): JSXElement {
    return (
      <For each={lines()}>
        {(line, lineIndex) => {
          const position = (): HighlightPosition | undefined =>
            positions()[lineIndex()];
          return (
            <div
              ref={(el) => (highlightContainerEls[lineIndex()] = el)}
              class="highlightContainer pointer-events-none absolute overflow-hidden"
              style={line.container}
            >
              <div
                class={cn(
                  "highlight absolute z-1 m-0 h-full overflow-hidden rounded bg-sub p-0",
                  animate()
                    ? "withAnimation [transition:left_0.25s_ease,right_0.25s_ease,opacity_0.125s_linear]"
                    : "transition-opacity duration-125 ease-linear",
                  hidden() ? "highlight-hidden opacity-0" : "opacity-100",
                )}
                style={{
                  left: px(position()?.highlightLeft),
                  right: px(position()?.highlightRight),
                }}
              >
                <div
                  ref={(el) => (inputWordsContainerEls[lineIndex()] = el)}
                  class={cn(
                    "inputWordsContainer relative",
                    animate() && "withAnimation [transition:all_0.25s_ease]",
                  )}
                  style={{
                    top: px(line.inputWordsContainer.top),
                    left: px(
                      position()?.inputContainerLeft ??
                        line.inputWordsContainer.left,
                    ),
                    width: px(line.inputWordsContainer.width),
                    height: px(line.inputWordsContainer.height),
                  }}
                >
                  <For each={line.inputWords}>
                    {(inputWord) => (
                      <div
                        ref={(el) => (inputWordEls[inputWord.index] = el)}
                        class="inputWord absolute text-[1em] leading-[1em] text-bg [font-variant:no-common-ligatures]"
                        style={{ left: px(inputWord.left) }}
                      >
                        {inputWord.text}
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          );
        }}
      </For>
    );
  }

  return { component, destroy };
}
