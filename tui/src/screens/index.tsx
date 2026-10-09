import type { Component } from "solid-js";

import type { ScreenId } from "../router/screens";

import { AccountScreen } from "./account";
import { AnnouncementsScreen } from "./announcements";
import { BrowserScreen } from "./browser";
import { ChallengesScreen } from "./challenges";
import { CustomScreen } from "./custom";
import { FunboxesScreen } from "./funboxes";
import { HistoryScreen } from "./history";
import { LeaderboardsScreen } from "./leaderboards";
import { PresetsScreen } from "./presets";
import { ProfileScreen } from "./profile";
import { QuotesScreen } from "./quotes";
import { ReplayScreen } from "./replay";
import { ResultScreen } from "./result";
import { SettingsScreen } from "./settings";
import { TagsScreen } from "./tags";
import { TestScreen } from "./test";

export const screens: Record<ScreenId, Component> = {
  test: TestScreen,
  history: HistoryScreen,
  result: ResultScreen,
  replay: ReplayScreen,
  settings: SettingsScreen,
  account: AccountScreen,
  announcements: AnnouncementsScreen,
  browser: BrowserScreen,
  tags: TagsScreen,
  presets: PresetsScreen,
  profile: ProfileScreen,
  quotes: QuotesScreen,
  custom: CustomScreen,
  challenges: ChallengesScreen,
  funboxes: FunboxesScreen,
  leaderboards: LeaderboardsScreen,
};
