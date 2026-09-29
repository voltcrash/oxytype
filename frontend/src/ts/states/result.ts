import { createStore } from "solid-js/store";
import { Language } from "@monkeytype/schemas/languages";
import { TypingSpeedUnit } from "@monkeytype/schemas/configs";

export type ResultCrownType =
  | "normal"
  | "ineligible"
  | "pending"
  | "error"
  | "warning";

export type ResultStat = {
  text: string;
  // undefined = no hover label
  ariaLabel?: string;
};

export type ResultSpeedStats = {
  typingSpeedUnit: TypingSpeedUnit;
  wpm: ResultStat;
  raw: ResultStat;
  // legacy dom only ever adds data-balloon-break, never removes it
  acc: ResultStat & { balloonBreak: boolean };
};

export type ResultStats = ResultSpeedStats & {
  consistency: ResultStat;
  time: { text: string; afk: string; ariaLabel: string };
  characters: string;
  // lines, rendered joined with <br>
  testType: string[];
  // lines, group hidden when empty
  other: string[];
  // undefined = not a quote test, group hidden
  source: string | undefined;
};

export type ResultTag = {
  id: string;
  name: string;
  ariaLabel?: string;
  pb: boolean;
};

export type ResultState = {
  stats: ResultStats | undefined;
  crown: {
    visible: boolean;
    // kept when hidden, showErrorCrownIfNeeded checks the last type
    type: ResultCrownType;
    text: string;
    wide: boolean;
  };
  tags: {
    // user has any tags
    visible: boolean;
    items: ResultTag[];
    // set once the result is saved, enables editing
    savedResultId: string | undefined;
  };
  quote: {
    language: Language | undefined;
    id: string;
    favoriteVisible: boolean;
    favorite: boolean;
    rateVisible: boolean;
    rated: boolean;
    rating: string;
    reportVisible: boolean;
  };
  timeToday: string;
  dailyLeaderboardRank: number | undefined;
  loginTip: boolean;
  retrySaving: boolean;
  // glarses mode, stats replaced by a check mark
  noStress: boolean;
};

export const [resultState, setResultState] = createStore<ResultState>({
  stats: undefined,
  crown: { visible: false, type: "normal", text: "", wide: false },
  tags: { visible: false, items: [], savedResultId: undefined },
  quote: {
    language: undefined,
    id: "",
    favoriteVisible: false,
    favorite: false,
    rateVisible: false,
    rated: false,
    rating: "",
    reportVisible: false,
  },
  timeToday: "",
  dailyLeaderboardRank: undefined,
  loginTip: false,
  retrySaving: false,
  noStress: false,
});
