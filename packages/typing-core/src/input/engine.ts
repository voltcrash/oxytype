import { InputConfig } from "./config";
import { getCommitCharacterType, normalizeData } from "./util";
import { isCharCorrect, shouldGoToNextWord } from "./validation";
import { DeleteInputType } from "./input-type";
import { isSpace } from "../strings";

export type InsertDecision = {
  data: string;
  correct: boolean;
  stopped: boolean;
  advance: boolean;
  inputValue: string;
  visualInputOverride?: string;
};
export function evaluateInsert(
  config: InputConfig,
  options: {
    data: string;
    inputValue: string;
    targetWord: string;
    nospace?: boolean;
    correctShiftUsed?: boolean | null;
  },
): InsertDecision {
  const data = normalizeData(
    options.data,
    options.inputValue,
    options.targetWord,
    config.language,
  );
  const correctShiftUsed = options.correctShiftUsed ?? null;
  const input = { ...options, data, correctShiftUsed };
  const correct = isCharCorrect(input, config);
  const stopped =
    (config.stopOnError === "letter" && !correct) || correctShiftUsed === false;
  return {
    data,
    correct,
    stopped,
    advance:
      !stopped &&
      shouldGoToNextWord(
        {
          ...input,
          commitCharacterType: getCommitCharacterType(input, options.nospace),
        },
        config,
      ),
    inputValue: stopped ? options.inputValue : options.inputValue + data,
    visualInputOverride:
      stopped && correctShiftUsed !== false && !config.blindMode
        ? options.inputValue + data
        : undefined,
  };
}

export function canDelete(
  config: InputConfig,
  state: {
    inputValue: string;
    wordIndex: number;
    previousWordCorrect: boolean;
    previousWordAvailable: boolean;
  },
): boolean {
  const empty = state.inputValue === "";
  if (empty && (state.wordIndex === 0 || !state.previousWordAvailable)) {
    return false;
  }
  if (config.freedomMode) return true;
  if (config.confidenceMode === "max") return false;
  if (empty && (config.confidenceMode === "on" || state.previousWordCorrect)) {
    return false;
  }
  return true;
}

export function getPreviousWordInput(
  input: string,
  type: DeleteInputType,
  nospace: boolean,
): string {
  if (type === "deleteWordBackward") return "";
  return nospace || /[ \n]$/.test(input) ? input.slice(0, -1) : input;
}

export function shouldBlockInsertion(
  config: InputConfig,
  options: {
    data: string;
    inputValue: string;
    targetWord: string;
    nospace: boolean;
    hasNewline: boolean;
  },
): boolean {
  let { data, inputValue, targetWord, nospace, hasNewline } = options;
  if (data === "\n" && !hasNewline && config.mode !== "zen") return true;
  if (isSpace(data) && nospace) return true;
  data = normalizeData(data, inputValue, targetWord, config.language);
  const hard = config.mode !== "zen" && config.deleteOnError.includes("hard");
  if (
    isSpace(data) &&
    inputValue === "" &&
    !config.strictSpace &&
    config.difficulty === "normal" &&
    !hard
  ) {
    return true;
  }
  const limit = config.mode === "zen" ? 30 : targetWord.length + 20;
  return (
    inputValue.length >= limit &&
    !shouldGoToNextWord(
      {
        data,
        inputValue,
        targetWord,
        commitCharacterType: getCommitCharacterType(
          { data, inputValue, targetWord },
          nospace,
        ),
      },
      config,
    )
  );
}
