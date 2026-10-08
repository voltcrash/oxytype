import { InputConfig } from "./config";
import { whorf } from "../mode";
import { type CommitCharacterType } from "./util";

/**
 * Check if the test should fail due to minimum burst settings
 * @param options - Options object
 * @param options.testInputWithData - Current test input result (after adding data)
 * @param options.currentWord - Current target word
 * @param options.lastBurst - Burst speed in WPM
 */
export function checkIfFailedDueToMinBurst(
  options: {
    testInputWithData: string;
    currentWord: string;
    lastBurst: number | null;
  },
  config: InputConfig,
): boolean {
  const { testInputWithData, currentWord, lastBurst } = options;
  if (config.minBurst !== "off" && lastBurst !== null) {
    let wordLength: number;
    if (config.mode === "zen") {
      wordLength = testInputWithData.length;
    } else {
      wordLength = currentWord.length;
    }

    const flex: number = whorf(config.minBurstCustomSpeed, wordLength);
    if (
      (config.minBurst === "fixed" && lastBurst < config.minBurstCustomSpeed) ||
      (config.minBurst === "flex" && lastBurst < flex)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if the test should fail due to difficulty settings
 * @param options - Options object
 * @param options.data - The text data to be inserted
 * @param options.testInput - Current test input result (before adding data)
 * @param options.targetWord - Current target word
 * @param options.correct - Whether the input is correct
 * @param options.commitCharacterType - Type of the commit character, false if not a commit character
 */
export function checkIfFailedDueToDifficulty(
  options: {
    data: string;
    testInput: string;
    targetWord: string;
    correct: boolean;
    commitCharacterType: CommitCharacterType | false;
  },
  config: InputConfig,
): boolean {
  const { data, testInput, targetWord, correct, commitCharacterType } = options;
  // Using space or newline instead of shouldInsertSpace or increasedWordIndex
  // because we want expert mode to fail no matter if confidence or stop on error is on

  if (config.mode === "zen") return false;

  const shouldFailDueToExpert =
    config.difficulty === "expert" &&
    commitCharacterType !== false &&
    // a leading separator (empty input) commits nothing and must not fail;
    // a nospace commit (e.g. a 1-letter word) does commit on empty input
    !(commitCharacterType === "separator" && testInput.length === 0) &&
    testInput + data !== targetWord;

  const shouldFailDueToMaster = config.difficulty === "master" && !correct;

  if (shouldFailDueToExpert || shouldFailDueToMaster) {
    return true;
  }
  return false;
}

/**
 * Determines if the test should finish
 * @param options - Options object
 * @param options.goingToNextWord - Is this input committing the word and moving on
 * @param options.testInputWithData - Current test input result (after adding data)
 * @param options.currentWord - Current target word
 * @param options.allWordsTyped - Have all words been typed
 * @returns Boolean if test should finish
 */
export function checkIfFinished(
  options: {
    goingToNextWord: boolean;
    testInputWithData: string;
    currentWord: string;
    allWordsTyped: boolean;
    allWordsGenerated: boolean;
  },
  config: InputConfig,
): boolean {
  const {
    goingToNextWord,
    testInputWithData,
    currentWord,
    allWordsTyped,
    allWordsGenerated,
  } = options;
  const wordIsCorrect = testInputWithData === currentWord;
  // stop on error and delete on error both take the last character back, so
  // quick end must not finish the test on a character that is about to go away
  const shouldQuickEnd =
    config.quickEnd &&
    currentWord.length === testInputWithData.length &&
    config.stopOnError === "off" &&
    config.deleteOnError === "off";
  if (
    allWordsTyped &&
    allWordsGenerated &&
    (wordIsCorrect || shouldQuickEnd || goingToNextWord)
  ) {
    return true;
  }
  return false;
}
