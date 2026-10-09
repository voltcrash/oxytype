import type { KeyBinding } from "../keys";
import type { ScreenId } from "../router/screens";

export type GlobalAction =
  | { type: "quit" }
  | { type: "back" }
  | { type: "open"; screen: ScreenId };

export type GlobalBinding = {
  key: KeyBinding;
  label: string;
  action: GlobalAction;
};

/** Always handled first so a screen can never trap the user. */
export const quitBinding: GlobalBinding = {
  key: { name: "c", ctrl: true },
  label: "quit",
  action: { type: "quit" },
};

/** Handled after the active screen declines the key. */
export const globalBindings: GlobalBinding[] = [
  { key: { name: "escape" }, label: "back", action: { type: "back" } },
  {
    key: { name: "t", ctrl: true },
    label: "test",
    action: { type: "open", screen: "test" },
  },
  {
    key: { name: "s", ctrl: true },
    label: "settings",
    action: { type: "open", screen: "settings" },
  },
  {
    key: { name: "a", ctrl: true },
    label: "account",
    action: { type: "open", screen: "account" },
  },
  {
    key: { name: "l", ctrl: true },
    label: "leaderboards",
    action: { type: "open", screen: "leaderboards" },
  },
];
