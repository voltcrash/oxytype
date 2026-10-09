import type { Accessor } from "solid-js";

import { createContext, createSignal, useContext } from "solid-js";

import type { ScreenId } from "./screens";
import type { ScreenStack } from "./stack";

import { currentScreen, popScreen, pushScreen, replaceScreen } from "./stack";

export type Router = {
  stack: Accessor<ScreenStack>;
  current: Accessor<ScreenId>;
  push: (screen: ScreenId) => void;
  replace: (screen: ScreenId) => void;
  /** Returns false when already at the root screen. */
  back: () => boolean;
  reset: (screen: ScreenId) => void;
};

export function createRouter(initial: ScreenId): Router {
  const [stack, setStack] = createSignal<ScreenStack>([initial]);

  return {
    stack,
    current: () => currentScreen(stack()),
    push: (screen) => setStack((it) => pushScreen(it, screen)),
    replace: (screen) => setStack((it) => replaceScreen(it, screen)),
    back: () => {
      const below = popScreen(stack());
      if (below === undefined) return false;
      setStack(below);
      return true;
    },
    reset: (screen) => setStack([screen]),
  };
}

export const RouterContext = createContext<Router>();

export function useRouter(): Router {
  const router = useContext(RouterContext);
  if (router === undefined) throw new Error("useRouter outside RouterContext");
  return router;
}
