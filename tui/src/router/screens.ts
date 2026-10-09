const screenIds = [
  "test",
  "result",
  "settings",
  "account",
  "leaderboards",
  "history",
  "tags",
  "presets",
  "profile",
  "quotes",
  "custom",
  "challenges",
  "funboxes",
  "announcements",
] as const;

export type ScreenId = (typeof screenIds)[number];

export const screenTitles: Record<ScreenId, string> = {
  test: "test",
  result: "result",
  settings: "settings",
  account: "account",
  leaderboards: "leaderboards",
  history: "history",
  tags: "tags",
  presets: "presets",
  profile: "profile",
  quotes: "quotes",
  custom: "custom text",
  challenges: "challenges",
  funboxes: "funboxes",
  announcements: "announcements",
};
