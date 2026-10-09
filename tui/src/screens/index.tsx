import type { Component } from "solid-js";

import type { ScreenId } from "../router/screens";

import { Placeholder } from "./placeholder";
import { ResultScreen } from "./result";
import { SettingsScreen } from "./settings";
import { TestScreen } from "./test";

export const screens: Record<ScreenId, Component> = {
  test: TestScreen,
  result: ResultScreen,
  settings: SettingsScreen,
  account: () => <Placeholder title="account" />,
  leaderboards: () => <Placeholder title="leaderboards" />,
};
