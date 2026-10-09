import type { Component } from "solid-js";

import type { ScreenId } from "../router/screens";

import { AccountScreen } from "./account";
import { AnnouncementsScreen } from "./announcements";
import { ChallengesScreen } from "./challenges";
import { CustomScreen } from "./custom";
import { FunboxesScreen } from "./funboxes";
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
  announcements: AnnouncementsScreen,
  tags: TagsScreen,
  presets: PresetsScreen,
  profile: ProfileScreen,
  quotes: QuotesScreen,
  custom: CustomScreen,
  challenges: ChallengesScreen,
  funboxes: FunboxesScreen,
  leaderboards: LeaderboardsScreen,
};
