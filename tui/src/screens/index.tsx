import type { Component } from "solid-js";

import type { ScreenId } from "../router/screens";

import { Placeholder } from "./placeholder";
import { ResultScreen } from "./result";
import { TestScreen } from "./test";

export const screens: Record<ScreenId, Component> = {
  test: TestScreen,
  result: ResultScreen,
  settings: () => <Placeholder title="settings" />,
  account: () => <Placeholder title="account" />,
  leaderboards: () => <Placeholder title="leaderboards" />,
};
