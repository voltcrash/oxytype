export const screenIds = [
  "test",
  "result",
  "settings",
  "account",
  "leaderboards",
] as const;

export type ScreenId = (typeof screenIds)[number];

export const screenTitles: Record<ScreenId, string> = {
  test: "test",
  result: "result",
  settings: "settings",
  account: "account",
  leaderboards: "leaderboards",
};
