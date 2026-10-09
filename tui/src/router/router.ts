import type { Accessor } from "solid-js";

import { createContext, createSignal, useContext } from "solid-js";

import type { ScreenId } from "./screens";
import type { ScreenStack } from "./stack";

import { currentScreen, popScreen, pushScreen, replaceScreen } from "./stack";

export type Router = {
  handoff: Accessor<{ title: string; url: string } | undefined>;
  openHandoff: (title: string, url: string) => void;
  profileName: Accessor<string>;
  openProfile: (name: string) => void;
  stack: Accessor<ScreenStack>;
  current: Accessor<ScreenId>;
  push: (screen: ScreenId) => void;
  replace: (screen: ScreenId) => void;
  /** Returns false when already at the root screen. */
  back: () => boolean;
  reset: (screen: ScreenId) => void;
};

export function createRouter(
  initial: ScreenId,
  canLeave: () => boolean = () => true,
): Router {
  const [profileName, setProfileName] = createSignal("");
  const [handoff, setHandoff] = createSignal<{ title: string; url: string }>();
  const [stack, setStack] = createSignal<ScreenStack>([initial]);

  return {
    handoff,
    openHandoff: (title, url) => {
      if (!canLeave()) return;
      setHandoff({ title, url });
      setStack((it) => pushScreen(it, "browser"));
    },
    profileName,
    openProfile: (name) => {
      if (!canLeave()) return;
      setProfileName(name);
      setStack((it) => pushScreen(it, "profile"));
    },
    stack,
    current: () => currentScreen(stack()),
    push: (screen) => {
      if (canLeave()) setStack((it) => pushScreen(it, screen));
    },
    replace: (screen) => {
      if (canLeave()) setStack((it) => replaceScreen(it, screen));
    },
    back: () => {
      if (!canLeave()) return false;
      const below = popScreen(stack());
      if (below === undefined) return false;
      setStack(below);
      return true;
    },
    reset: (screen) => {
      if (canLeave()) setStack([screen]);
    },
  };
}

export const RouterContext = createContext<Router>();

export function useRouter(): Router {
  const router = useContext(RouterContext);
  if (router === undefined) throw new Error("useRouter outside RouterContext");
  return router;
}
