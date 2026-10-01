import type { Config } from "@oxytype/schemas/configs";
import * as Hangul from "hangul-js";

import * as Strings from "../utils/strings";

export type WordLetter = {
  char: string;
  // legacy letter classes (correct, incorrect, extra, corrected, extraCorrected)
  classes: string[];
};

export type WordsHistoryItem = {
  letters: WordLetter[];
  // word was typed (legacy "nocursor" class)
  typed: boolean;
  error: boolean;
  burst: number | undefined;
  // shown on hover, spaces replaced by underscores
  input: string;
};

type LetterOptions = {
  zen: boolean;
  korean: boolean;
};

export function buildWordLetters(
  input: string | undefined,
  corrected: string | undefined,
  targetWord: string | undefined,
  options: LetterOptions,
): WordLetter[] {
  const out: WordLetter[] = [];
  // the trailing commit separator (space/newline) is structural, not a letter;
  // strip it from all three so it never renders and over-typed extras / untyped
  // tails line up correctly
  if (input?.endsWith(" ") || input?.endsWith("\n")) input = input.slice(0, -1);
  if (corrected?.endsWith(" ") || corrected?.endsWith("\n")) {
    corrected = corrected.slice(0, -1);
  }
  if (targetWord?.endsWith(" ") || targetWord?.endsWith("\n")) {
    targetWord = targetWord.slice(0, -1);
  }

  const inputChars = Strings.splitIntoCharacters(input ?? "");
  const targetChars = Strings.splitIntoCharacters(targetWord ?? "");
  const correctedChars = Strings.splitIntoCharacters(corrected ?? "");
  for (let c = 0; c < Math.max(targetChars.length, inputChars.length); c++) {
    const inputChar = inputChars[c];
    const targetChar = targetChars[c];

    const correctedChar = correctedChars[c];
    const extraCorrected: string[] = [];
    const historyWord: string = !options.korean
      ? (corrected ?? "")
      : Hangul.assemble((corrected ?? "").split(""));
    if (
      c >= targetChars.length - 1 &&
      c + 1 === inputChars.length &&
      historyWord.length > inputChars.length
    ) {
      extraCorrected.push("extraCorrected");
    }

    let displayLetter = (inputChar ?? targetChar) as string;
    if (displayLetter === " ") {
      displayLetter = "_";
    }

    if (options.zen || targetChar !== undefined) {
      if (options.zen || inputChar === targetChar) {
        if (correctedChar === inputChar || correctedChar === undefined) {
          out.push({
            char: displayLetter,
            classes: ["correct", ...extraCorrected],
          });
        } else {
          out.push({
            char: displayLetter,
            classes: ["corrected", ...extraCorrected],
          });
        }
      } else {
        if (inputChar === undefined) {
          out.push({ char: targetChar as string, classes: [] });
        } else {
          out.push({
            char: targetChar as string,
            classes: ["incorrect", ...extraCorrected],
          });
        }
      }
    } else {
      out.push({ char: displayLetter, classes: ["incorrect", "extra"] });
    }
  }
  return out;
}

export function buildWordsHistory(options: {
  inputHistory: string[];
  correctedHistory: string[];
  burstHistory: number[];
  getTargetWord: (index: number) => string;
  zen: boolean;
  timed: boolean;
  korean: boolean;
}): WordsHistoryItem[] {
  const { inputHistory, correctedHistory, burstHistory } = options;
  const items: WordsHistoryItem[] = [];

  const inputHistoryLength = inputHistory.length;
  for (let i = 0; i < inputHistoryLength + 2; i++) {
    const input = inputHistory[i];
    const target = options.getTargetWord(i);
    const corrected = options.korean
      ? Hangul.assemble((correctedHistory[i] ?? "").split(""))
      : correctedHistory[i];

    const isIncorrectWord = input !== target;
    const isLastWord = i === inputHistoryLength - 1;
    const isPartiallyCorrect = target.startsWith(input ?? "");

    const shouldShowError =
      !options.zen &&
      !(isLastWord && options.timed && isPartiallyCorrect) &&
      input !== undefined &&
      input !== "";

    let inputAttribute = input ?? "";

    if (corrected !== undefined && corrected !== "") {
      inputAttribute = corrected;
    }

    if (
      inputAttribute.length >= target.length &&
      (inputAttribute.endsWith(" ") || inputAttribute.endsWith("\n"))
    ) {
      inputAttribute = inputAttribute.slice(0, -1);
    }

    items.push({
      letters: buildWordLetters(input, corrected, target, options),
      typed: input !== "" && input !== undefined,
      error: isIncorrectWord && shouldShowError,
      burst: burstHistory[i],
      input: inputAttribute.replace(/ /g, "_"),
    });
  }

  return items;
}

const TAB_ICON = `<i class="fas fa-long-arrow-alt-right fa-fw"></i>`;
const NEWLINE_ICON = `<i class="fas fa-level-down-alt fa-rotate-90 fa-fw"></i>`;

// visible form of a typed character: space -> "_", tab/newline -> their icons
function displayTypedChar(char: string | undefined): string {
  if (char === " ") return "_";
  if (char === "\t") return TAB_ICON;
  if (char === "\n") return NEWLINE_ICON;
  return char ?? "";
}

export function buildInitialWordMarkup(
  word: string,
  wordIndex: number,
  getWordHtml?: (char: string, letterTag?: boolean) => string,
): string {
  let newlineafter = false;
  let retval = `<div class='word' data-wordindex='${wordIndex}'>`;

  const chars = Strings.splitIntoCharacters(word);
  for (const char of chars) {
    if (getWordHtml) {
      retval += getWordHtml(char, true);
    } else if (char === "\t") {
      retval += `<letter class='tabChar'><i class="fas fa-long-arrow-alt-right fa-fw"></i></letter>`;
    } else if (char === "\n") {
      newlineafter = true;
      retval += `<letter class='nlChar'><i class="fas fa-level-down-alt fa-rotate-90 fa-fw"></i></letter>`;
    } else {
      retval += `<letter>${char}</letter>`;
    }
  }
  retval += "</div>";
  if (newlineafter) {
    retval +=
      "<div class='beforeNewline'></div><div class='newline'></div><div class='afterNewline'></div>";
  }
  return retval;
}

export function buildLiveWordMarkup(options: {
  currentWord: string | undefined;
  input: string;
  compositionData: string;
  zen: boolean;
  indicateTypos: Config["indicateTypos"];
  compositionDisplay: Config["compositionDisplay"];
  getWordHtml?: (char: string, letterTag?: boolean) => string;
}): { html: string; hintIndices: number[][]; newlineafter: boolean } {
  const {
    currentWord,
    input,
    compositionData,
    zen,
    indicateTypos,
    compositionDisplay,
    getWordHtml,
  } = options;
  let ret = "";
  const hintIndices: number[][] = [];

  let newlineafter = false;

  if (zen) {
    for (const char of input) {
      if (char === "\t") {
        ret += `<letter class='tabChar correct' style="opacity: 0"><i class="fas fa-long-arrow-alt-right fa-fw"></i></letter>`;
      } else if (char === "\n") {
        newlineafter = true;
        ret += `<letter class='nlChar correct' style="opacity: 0"><i class="fas fa-level-down-alt fa-rotate-90 fa-fw"></i></letter>`;
      } else {
        ret += `<letter class="correct">${char}</letter>`;
      }
    }
    if (input === "" && compositionData === "") {
      ret += `<letter class='invisible'>_</letter>`;
    }

    for (const char of compositionData) {
      ret += `<letter class="dead">${char}</letter>`;
    }
  } else {
    const inputChars = Strings.splitIntoCharacters(input);
    const currentWordChars = Strings.splitIntoCharacters(currentWord ?? "");
    for (let i = 0; i < inputChars.length; i++) {
      const charCorrect = currentWordChars[i] === inputChars[i];

      let currentLetter = currentWordChars[i] as string;
      let tabChar = "";
      let nlChar = "";
      if (getWordHtml) {
        const cl = getWordHtml(currentLetter);
        if (cl !== "") {
          currentLetter = cl;
        }
      } else if (currentLetter === "\t") {
        tabChar = "tabChar";
        currentLetter = `<i class="fas fa-long-arrow-alt-right fa-fw"></i>`;
      } else if (currentLetter === "\n") {
        nlChar = "nlChar";
        currentLetter = `<i class="fas fa-level-down-alt fa-rotate-90 fa-fw"></i>`;
      }

      if (charCorrect) {
        ret += `<letter class="correct ${tabChar}${nlChar}">${currentLetter}</letter>`;
      } else if (currentLetter === undefined) {
        const letter = displayTypedChar(inputChars[i]);
        ret += `<letter class="incorrect extra ${tabChar}${nlChar}">${letter}</letter>`;
      } else {
        let charString = currentLetter;

        if (indicateTypos === "replace" || indicateTypos === "both") {
          charString = displayTypedChar(inputChars[i] ?? currentLetter);
        }

        ret += `<letter class="incorrect ${tabChar}${nlChar}">${charString}</letter>`;
        if (indicateTypos === "below" || indicateTypos === "both") {
          const lastBlock = hintIndices[hintIndices.length - 1];
          if (lastBlock?.[lastBlock.length - 1] === i - 1) {
            lastBlock.push(i);
          } else {
            hintIndices.push([i]);
          }
        }
      }
    }

    for (let i = 0; i < compositionData.length; i++) {
      const compositionChar = compositionData[i];
      let charToShow = currentWordChars[input.length + i] ?? compositionChar;

      if (compositionDisplay === "replace") {
        charToShow = compositionChar === " " ? "_" : compositionChar;
      }

      let correctClass = "";
      if (compositionChar === currentWordChars[input.length + i]) {
        correctClass = "correct";
      }

      ret += `<letter class="dead ${correctClass}">${charToShow}</letter>`;
    }

    for (
      let i = inputChars.length + compositionData.length;
      i < currentWordChars.length;
      i++
    ) {
      const currentLetter = currentWordChars[i];
      if (getWordHtml) {
        ret += getWordHtml(currentLetter as string, true);
      } else if (currentLetter === "\t") {
        ret += `<letter class='tabChar'><i class="fas fa-long-arrow-alt-right fa-fw"></i></letter>`;
      } else if (currentLetter === "\n") {
        ret += `<letter class='nlChar'><i class="fas fa-level-down-alt fa-rotate-90 fa-fw"></i></letter>`;
      } else {
        ret += `<letter>${currentLetter}</letter>`;
      }
    }
  }

  return { html: ret, hintIndices, newlineafter };
}
