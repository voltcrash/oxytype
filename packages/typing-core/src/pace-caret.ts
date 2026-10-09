export type PaceState = {
  wpm: number;
  cps: number;
  spc: number;
  correction: number;
  currentWordIndex: number;
  currentLetterIndex: number;
  wordsStatus: Record<number, true | undefined>;
};

export function createPaceState(wpm: number): PaceState | null {
  if (!Number.isFinite(wpm) || wpm < 1) return null;
  return {
    wpm,
    cps: (wpm * 5) / 60,
    spc: 60 / (wpm * 5),
    correction: 0,
    currentWordIndex: 0,
    currentLetterIndex: 0,
    wordsStatus: {},
  };
}
export function advancePace(
  settings: PaceState,
  getWord: (index: number) => string | undefined,
  blindMode: boolean,
): boolean {
  const length = (index: number): number => {
    const word = getWord(index);
    if (word === undefined) throw new Error("Pace caret out of words");
    return word.length;
  };

  try {
    if (settings.currentLetterIndex >= length(settings.currentWordIndex)) {
      //go to the next word
      settings.currentLetterIndex = -1;
      settings.currentWordIndex++;
    }
    settings.currentLetterIndex++;

    if (!blindMode) {
      if (settings.correction < 0) {
        while (settings.correction < 0) {
          settings.currentLetterIndex--;
          if (settings.currentLetterIndex <= -1) {
            //go to the previous word
            settings.currentLetterIndex = length(settings.currentWordIndex - 1);
            settings.currentWordIndex--;
          }
          settings.correction++;
        }
      } else if (settings.correction > 0) {
        while (settings.correction > 0) {
          settings.currentLetterIndex++;
          if (
            settings.currentLetterIndex >=
            length(settings.currentWordIndex) + 1
          ) {
            //go to the next word
            settings.currentLetterIndex = 0;
            settings.currentWordIndex++;
          }
          settings.correction--;
        }
      }
    }
  } catch {
    return false;
  }
  return true;
}

export function correctPace(
  settings: PaceState | null,
  wordIndex: number,
  correct: boolean,
  currentWord: string,
  blindMode: boolean,
): void {
  if (correct) {
    if (settings?.wordsStatus[wordIndex] === true && !blindMode) {
      settings.wordsStatus[wordIndex] = undefined;
      settings.correction -= currentWord.length;
    }
  } else {
    if (
      settings !== null &&
      settings.wordsStatus[wordIndex] === undefined &&
      !blindMode
    ) {
      settings.wordsStatus[wordIndex] = true;
      settings.correction += currentWord.length;
    }
  }
}
