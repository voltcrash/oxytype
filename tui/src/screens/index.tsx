import type { Component } from "solid-js";

import type { ScreenId } from "../router/screens";

import { AccountScreen } from "./account";
import { HistoryScreen } from "./history";
import { LeaderboardsScreen } from "./leaderboards";
import { PresetsScreen } from "./presets";
import { ProfileScreen } from "./profile";
import { QuotesScreen } from "./quotes";
import { ResultScreen } from "./result";
import { SettingsScreen } from "./settings";
import { TagsScreen } from "./tags";
import { TestScreen } from "./test";

export const screens: Record<ScreenId, Component> = {
  test: TestScreen,
  history: HistoryScreen,
  result: ResultScreen,
  settings: SettingsScreen,
  account: AccountScreen,
  tags: TagsScreen,
  presets: PresetsScreen,
  profile: ProfileScreen,
  quotes: QuotesScreen,
  leaderboards: LeaderboardsScreen,
};
