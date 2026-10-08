import { EventLog } from "./events/types";
import {
  getMissedWords,
  getInputHistory,
  getWordBurstHistory,
} from "./events/stats";

export type PracticeWords = { text: string[]; sectionLimit: number };
export function buildPracticeWords(
  eventLog: EventLog,
  words: string[],
  missed: "off" | "words" | "biwords",
  slow: boolean,
  notify?: (message: string) => void,
): PracticeWords | null {
  if (eventLog.context.mode === "zen") return null;
  let limit;
  if ((missed === "words" && !slow) || (missed === "off" && slow)) {
    limit = 20;
  } else {
    // (biwords) or (missed-words and slow) or (biwords and slow)
    limit = 10;
  }

  const missedWords = getMissedWords(eventLog);

  // missed word, previous word, count
  let sortableMissedWords: [string, number][] = [];
  if (missed === "words") {
    Object.keys(missedWords).forEach((missedWord) => {
      const missedWordCount = missedWords[missedWord];
      if (missedWordCount !== undefined) {
        sortableMissedWords.push([missedWord, missedWordCount]);
      }
    });
    sortableMissedWords.sort((a, b) => {
      return b[1] - a[1];
    });
    sortableMissedWords = sortableMissedWords.slice(0, limit);
  }

  let sortableMissedBiwords: [string, string, number][] = [];
  if (missed === "biwords") {
    for (let i = 0; i < words.length; i++) {
      const missedWord = words[i];

      if (missedWord === undefined) continue; // won't happen, but ts complains

      const missedWordCount = missedWords[missedWord];
      if (missedWordCount !== undefined) {
        sortableMissedBiwords.push([
          missedWord,
          words[i - 1] ?? "",
          missedWordCount,
        ]);
      }
    }
    sortableMissedBiwords.sort((a, b) => {
      return b[2] - a[2];
    });
    sortableMissedBiwords = sortableMissedBiwords.slice(0, limit);
  }

  if (
    ((missed === "words" && sortableMissedWords.length === 0) ||
      (missed === "biwords" && sortableMissedBiwords.length === 0)) &&
    !slow
  ) {
    notify?.("You haven't missed any words");
    return null;
  }

  let sortableSlowWords: [string, number][] = [];
  if (slow) {
    const typedWords = words.slice(0, getInputHistory(eventLog).length - 1);

    const burstHistory = getWordBurstHistory(eventLog);

    sortableSlowWords = typedWords.map((e, i) => [e, burstHistory[i] ?? 0]);
    sortableSlowWords.sort((a, b) => {
      return a[1] - b[1];
    });
    sortableSlowWords = sortableSlowWords.slice(
      0,
      Math.min(limit, Math.round(typedWords.length * 0.2)),
    );
    if (sortableSlowWords.length === 0) {
      notify?.("Test too short to classify slow words.");
    }
  }

  // console.log(sortableMissedWords);
  // console.log(sortableMissedBiwords);
  // console.log(sortableSlowWords);

  if (
    sortableMissedWords.length === 0 &&
    sortableMissedBiwords.length === 0 &&
    sortableSlowWords.length === 0
  ) {
    notify?.("Could not start a new custom test");
    return null;
  }

  const newCustomText: string[] = [];
  sortableMissedWords.forEach((missedEntry) => {
    for (let i = 0; i < missedEntry[1]; i++) {
      newCustomText.push(missedEntry[0]);
    }
  });

  sortableMissedBiwords.forEach((missedBiwords) => {
    for (let i = 0; i < missedBiwords[2]; i++) {
      if (missedBiwords[1] !== "") {
        newCustomText.push(`${missedBiwords[1]} ${missedBiwords[0]}`);
      } else {
        newCustomText.push(missedBiwords[0]);
      }
    }
  });

  sortableSlowWords.forEach((slowEntry, index) => {
    for (let i = 0; i < sortableSlowWords.length - index; i++) {
      newCustomText.push(slowEntry[0]);
    }
  });

  return {
    text: newCustomText,
    sectionLimit:
      (sortableSlowWords.length +
        sortableMissedWords.length +
        sortableMissedBiwords.length) *
      5,
  };
}
